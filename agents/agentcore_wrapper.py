"""
AgentCore Wrapper for Strands Agents.

This module provides a wrapper class that adapts existing Strands agents
to work with AWS Bedrock AgentCore Runtime, handling request/response
format conversion, error handling, and retry logic.
"""

import logging
import asyncio
import uuid
import sys
import os
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone
from functools import wraps

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from config.mcp_client import MCPClient, create_mcp_client, ToolInvocationError

logger = logging.getLogger(__name__)


class AgentCoreError(Exception):
    """Base exception for AgentCore wrapper errors."""
    pass


class RequestConversionError(AgentCoreError):
    """Error during request format conversion."""
    pass


class ResponseConversionError(AgentCoreError):
    """Error during response format conversion."""
    pass


class AgentExecutionError(AgentCoreError):
    """Error during agent execution."""
    pass


class AgentCoreWrapper:
    """
    Wrapper class that adapts Strands agents to AgentCore Runtime.
    
    This wrapper handles:
    - Request/response format conversion between AgentCore and Strands
    - Error handling and retry logic
    - Execution tracking and logging
    - Timeout management
    """
    
    def __init__(
        self,
        strands_agent: Any,
        agent_name: str,
        max_retries: int = 3,
        timeout_seconds: int = 300,
        retry_delay_seconds: float = 1.0,
        gateway_id: Optional[str] = None,
        region: str = "us-east-1",
        use_gateway_tools: bool = True
    ):
        """
        Initialize the AgentCore wrapper.
        
        Args:
            strands_agent: The Strands agent instance to wrap
            agent_name: Name of the agent for logging and tracking
            max_retries: Maximum number of retry attempts for transient errors
            timeout_seconds: Maximum execution time in seconds
            retry_delay_seconds: Initial delay between retries (exponential backoff)
            gateway_id: AgentCore Gateway ID for tool invocation (optional)
            region: AWS region
            use_gateway_tools: Whether to use Gateway tools via MCP (default: True)
        """
        self.strands_agent = strands_agent
        self.agent_name = agent_name
        self.max_retries = max_retries
        self.timeout_seconds = timeout_seconds
        self.retry_delay_seconds = retry_delay_seconds
        self.use_gateway_tools = use_gateway_tools
        
        # Initialize MCP client for Gateway tool invocation
        self.mcp_client = None
        if use_gateway_tools and gateway_id:
            try:
                self.mcp_client = create_mcp_client(gateway_id, region)
                logger.info(f"MCP client initialized for gateway: {gateway_id}")
            except Exception as e:
                logger.warning(f"Failed to initialize MCP client: {str(e)}")
                logger.warning("Agent will use direct tool calls instead of Gateway")
        elif use_gateway_tools:
            logger.warning("Gateway ID not provided, agent will use direct tool calls")
        
        logger.info(
            f"Initialized AgentCoreWrapper for {agent_name} "
            f"(max_retries={max_retries}, timeout={timeout_seconds}s, "
            f"use_gateway={use_gateway_tools})"
        )
    
    def convert_agentcore_request_to_strands(
        self,
        agentcore_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Convert AgentCore request format to Strands agent format.
        
        AgentCore Request Format:
        {
            "contract_text": str,
            "jurisdiction": str,
            "user_id": str,
            "session_id": str,
            "include_deviation_analysis": bool,
            "include_obligation_extraction": bool,
            "min_confidence": float
        }
        
        Strands Agent Format:
        {
            "contract_text": str,
            "jurisdiction": str,
            "min_confidence": float,
            "s3_bucket": str (optional),
            "s3_key": str (optional),
            "file_size": int (optional)
        }
        
        Args:
            agentcore_request: Request in AgentCore format
            
        Returns:
            Request in Strands format
            
        Raises:
            RequestConversionError: If conversion fails
        """
        try:
            # Extract required fields
            contract_text = agentcore_request.get('contract_text')
            
            # Check for S3 location as alternative to contract_text
            s3_bucket = agentcore_request.get('s3_bucket')
            s3_key = agentcore_request.get('s3_key')
            
            if not contract_text and not (s3_bucket and s3_key):
                raise RequestConversionError(
                    "Either 'contract_text' or S3 location (s3_bucket and s3_key) must be provided"
                )
            
            # Build Strands request
            strands_request = {
                'jurisdiction': agentcore_request.get('jurisdiction', 'US'),
                'min_confidence': agentcore_request.get('min_confidence', 0.7)
            }
            
            # Add contract text or S3 location
            if contract_text:
                strands_request['contract_text'] = contract_text
            else:
                strands_request['s3_bucket'] = s3_bucket
                strands_request['s3_key'] = s3_key
                strands_request['file_size'] = agentcore_request.get('file_size', 0)
            
            logger.debug(
                f"Converted AgentCore request to Strands format: "
                f"jurisdiction={strands_request['jurisdiction']}, "
                f"has_text={bool(contract_text)}, "
                f"has_s3={bool(s3_bucket and s3_key)}"
            )
            
            return strands_request
            
        except Exception as e:
            logger.error(f"Request conversion failed: {str(e)}")
            raise RequestConversionError(f"Failed to convert request: {str(e)}") from e
    
    def convert_strands_response_to_agentcore(
        self,
        strands_response: Dict[str, Any],
        request_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Convert Strands agent response to AgentCore format.
        
        Strands Response Format:
        {
            "success": bool,
            "analysis_result": dict,
            "agent_response": str,
            "execution_time": float,
            "tools_used": list,
            "analysis_metadata": dict,
            "error": str (if failed)
        }
        
        AgentCore Response Format:
        {
            "success": bool,
            "analysis_id": str,
            "contract_type": str,
            "executive_summary": str,
            "key_terms": dict,
            "risk_assessment": dict,
            "compliance_analysis": dict,
            "deviation_analysis": dict (optional),
            "obligations": list (optional),
            "metadata": dict,
            "execution_time": float,
            "agent_trace_id": str,
            "error": str (if failed)
        }
        
        Args:
            strands_response: Response from Strands agent
            request_metadata: Metadata from the original request
            
        Returns:
            Response in AgentCore format
            
        Raises:
            ResponseConversionError: If conversion fails
        """
        try:
            # Generate unique analysis ID
            analysis_id = str(uuid.uuid4())
            
            # Check if Strands execution was successful
            if not strands_response.get('success', False):
                return {
                    'success': False,
                    'analysis_id': analysis_id,
                    'error': strands_response.get('error', 'Unknown error occurred'),
                    'execution_time': strands_response.get('execution_time', 0.0),
                    'agent_trace_id': analysis_id,
                    'metadata': {
                        'user_id': request_metadata.get('user_id'),
                        'session_id': request_metadata.get('session_id'),
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'agent_name': self.agent_name
                    }
                }
            
            # Extract analysis result and agent response
            analysis_result = strands_response.get('analysis_result', {})
            agent_response = strands_response.get('agent_response', '')
            
            # Parse structured data from analysis_result if available
            # Otherwise, extract from agent_response text
            agentcore_response = {
                'success': True,
                'analysis_id': analysis_id,
                'contract_type': analysis_result.get('contract_type', 'Unknown'),
                'executive_summary': agent_response,  # Full agent response as summary
                'key_terms': {
                    'parties': analysis_result.get('parties', []),
                    'duration': analysis_result.get('duration', {}),
                    'pricing': analysis_result.get('pricing', {})
                },
                'risk_assessment': analysis_result.get('risk_assessment', {}),
                'compliance_analysis': analysis_result.get('compliance_analysis', {}),
                'metadata': {
                    'user_id': request_metadata.get('user_id'),
                    'session_id': request_metadata.get('session_id'),
                    'jurisdiction': request_metadata.get('jurisdiction', 'US'),
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'agent_name': self.agent_name,
                    'tools_used': strands_response.get('tools_used', []),
                    'analysis_metadata': strands_response.get('analysis_metadata', {})
                },
                'execution_time': strands_response.get('execution_time', 0.0),
                'agent_trace_id': analysis_id
            }
            
            # Add optional fields if requested
            if request_metadata.get('include_deviation_analysis'):
                agentcore_response['deviation_analysis'] = analysis_result.get('deviation_analysis', {})
            
            if request_metadata.get('include_obligation_extraction'):
                agentcore_response['obligations'] = analysis_result.get('obligations', [])
            
            logger.debug(
                f"Converted Strands response to AgentCore format: "
                f"analysis_id={analysis_id}, "
                f"success={agentcore_response['success']}"
            )
            
            return agentcore_response
            
        except Exception as e:
            logger.error(f"Response conversion failed: {str(e)}")
            raise ResponseConversionError(f"Failed to convert response: {str(e)}") from e
    
    def is_retryable_error(self, error: Exception) -> bool:
        """
        Determine if an error is retryable.
        
        Retryable errors include:
        - Throttling exceptions
        - Service unavailable errors
        - Timeout errors
        - Network errors
        
        Args:
            error: The exception to check
            
        Returns:
            True if the error is retryable, False otherwise
        """
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        retryable_patterns = [
            'throttling',
            'rate limit',
            'service unavailable',
            'unavailable',
            'timeout',
            'connection',
            'network',
            'temporar',  # Matches both 'temporary' and 'temporarily'
            'transient'
        ]
        
        retryable_types = [
            'TimeoutError',
            'ConnectionError',
            'ThrottlingException',
            'ServiceUnavailableException'
        ]
        
        # Check error message
        for pattern in retryable_patterns:
            if pattern in error_str:
                logger.info(f"Error is retryable (pattern match: {pattern})")
                return True
        
        # Check error type
        if error_type in retryable_types:
            logger.info(f"Error is retryable (type match: {error_type})")
            return True
        
        logger.info(f"Error is not retryable: {error_type}")
        return False
    
    async def execute_with_retry(
        self,
        agentcore_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the Strands agent with retry logic.
        
        Args:
            agentcore_request: Request in AgentCore format
            
        Returns:
            Response in AgentCore format
            
        Raises:
            AgentExecutionError: If execution fails after all retries
        """
        # Store request metadata for response conversion
        request_metadata = {
            'user_id': agentcore_request.get('user_id'),
            'session_id': agentcore_request.get('session_id'),
            'jurisdiction': agentcore_request.get('jurisdiction', 'US'),
            'include_deviation_analysis': agentcore_request.get('include_deviation_analysis', True),
            'include_obligation_extraction': agentcore_request.get('include_obligation_extraction', True)
        }
        
        # Convert request format
        try:
            strands_request = self.convert_agentcore_request_to_strands(agentcore_request)
        except RequestConversionError as e:
            logger.error(f"Request conversion failed: {str(e)}")
            return {
                'success': False,
                'analysis_id': str(uuid.uuid4()),
                'error': f"Invalid request format: {str(e)}",
                'execution_time': 0.0,
                'agent_trace_id': str(uuid.uuid4()),
                'metadata': request_metadata
            }
        
        # Execute with retry logic
        last_error = None
        for attempt in range(self.max_retries):
            try:
                logger.info(
                    f"Executing {self.agent_name} (attempt {attempt + 1}/{self.max_retries})"
                )
                
                start_time = datetime.now(timezone.utc)
                
                # Execute Strands agent with timeout
                strands_response = await asyncio.wait_for(
                    self._execute_strands_agent(strands_request),
                    timeout=self.timeout_seconds
                )
                
                execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
                
                # Add execution time if not present
                if 'execution_time' not in strands_response:
                    strands_response['execution_time'] = execution_time
                
                # Convert response format
                agentcore_response = self.convert_strands_response_to_agentcore(
                    strands_response,
                    request_metadata
                )
                
                logger.info(
                    f"Agent execution completed successfully: "
                    f"analysis_id={agentcore_response['analysis_id']}, "
                    f"time={execution_time:.2f}s"
                )
                
                return agentcore_response
                
            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    f"Agent execution timed out after {self.timeout_seconds}s "
                    f"(attempt {attempt + 1}/{self.max_retries})"
                )
                
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay_seconds * (2 ** attempt)  # Exponential backoff
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                
            except Exception as e:
                last_error = e
                logger.error(
                    f"Agent execution failed: {type(e).__name__}: {str(e)} "
                    f"(attempt {attempt + 1}/{self.max_retries})"
                )
                
                # Check if error is retryable
                if not self.is_retryable_error(e):
                    logger.error("Error is not retryable, aborting")
                    break
                
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay_seconds * (2 ** attempt)
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)
        
        # All retries exhausted
        error_message = f"Agent execution failed after {self.max_retries} attempts: {str(last_error)}"
        logger.error(error_message)
        
        return {
            'success': False,
            'analysis_id': str(uuid.uuid4()),
            'error': error_message,
            'error_type': type(last_error).__name__ if last_error else 'Unknown',
            'execution_time': 0.0,
            'agent_trace_id': str(uuid.uuid4()),
            'metadata': request_metadata
        }
    
    async def invoke_gateway_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        oauth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invoke a tool through the AgentCore Gateway using MCP protocol.
        
        Args:
            tool_name: Name of the tool to invoke
            arguments: Tool arguments
            oauth_token: OAuth token for authentication (optional)
            
        Returns:
            Tool execution result
            
        Raises:
            AgentExecutionError: If MCP client is not initialized or invocation fails
        """
        if not self.mcp_client:
            raise AgentExecutionError(
                "MCP client not initialized. Cannot invoke Gateway tools."
            )
        
        try:
            # Set OAuth token if provided
            if oauth_token:
                self.mcp_client.set_oauth_token(oauth_token)
            
            # Invoke tool through Gateway
            logger.debug(f"Invoking Gateway tool: {tool_name}")
            
            # Run synchronous MCP call in executor
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.mcp_client.invoke_tool,
                tool_name,
                arguments
            )
            
            return result
            
        except ToolInvocationError as e:
            logger.error(f"Gateway tool invocation failed: {str(e)}")
            raise AgentExecutionError(
                f"Failed to invoke Gateway tool '{tool_name}': {str(e)}"
            ) from e
        except Exception as e:
            logger.error(f"Unexpected error invoking Gateway tool: {str(e)}")
            raise AgentExecutionError(
                f"Unexpected error invoking Gateway tool '{tool_name}': {str(e)}"
            ) from e
    
    async def invoke_gateway_tools_batch(
        self,
        tool_calls: list[Dict[str, Any]],
        oauth_token: Optional[str] = None,
        parallel: bool = True
    ) -> list[Dict[str, Any]]:
        """
        Invoke multiple tools through the Gateway in batch.
        
        Args:
            tool_calls: List of tool calls with 'name' and 'arguments'
            oauth_token: OAuth token for authentication (optional)
            parallel: Whether to invoke tools in parallel
            
        Returns:
            List of tool execution results
        """
        if not self.mcp_client:
            raise AgentExecutionError(
                "MCP client not initialized. Cannot invoke Gateway tools."
            )
        
        try:
            # Set OAuth token if provided
            if oauth_token:
                self.mcp_client.set_oauth_token(oauth_token)
            
            # Invoke tools in batch
            logger.debug(f"Invoking {len(tool_calls)} Gateway tools in batch")
            
            # Run synchronous MCP call in executor
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                self.mcp_client.invoke_tools_batch,
                tool_calls,
                parallel
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Batch Gateway tool invocation failed: {str(e)}")
            raise AgentExecutionError(
                f"Failed to invoke Gateway tools in batch: {str(e)}"
            ) from e
    
    def get_available_tools(self, query: Optional[str] = None) -> list[Dict[str, Any]]:
        """
        Discover available tools from the Gateway.
        
        Args:
            query: Natural language query to find relevant tools (optional)
            
        Returns:
            List of tool definitions
        """
        if not self.mcp_client:
            logger.warning("MCP client not initialized. Cannot discover tools.")
            return []
        
        try:
            tools = self.mcp_client.discover_tools(query)
            logger.info(f"Discovered {len(tools)} tools from Gateway")
            return tools
        except Exception as e:
            logger.error(f"Tool discovery failed: {str(e)}")
            return []
    
    async def _execute_strands_agent(
        self,
        strands_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the Strands agent.
        
        This method wraps the synchronous Strands agent call in an async context.
        If Gateway tools are enabled, the agent will use MCP for tool invocation.
        
        Args:
            strands_request: Request in Strands format
            
        Returns:
            Response from Strands agent
        """
        # Check if agent has analyze_contract method
        if hasattr(self.strands_agent, 'analyze_contract'):
            # Inject Gateway tool invocation capability if available
            if self.use_gateway_tools and self.mcp_client:
                # Store reference to wrapper for tool invocation
                self.strands_agent._gateway_wrapper = self
                logger.debug("Gateway tool invocation enabled for agent")
            
            # Run synchronous method in executor to avoid blocking
            loop = asyncio.get_event_loop()
            
            # Create a callable with the arguments bound
            def call_agent():
                return self.strands_agent.analyze_contract(**strands_request)
            
            result = await loop.run_in_executor(None, call_agent)
            return result
        else:
            raise AgentExecutionError(
                f"Strands agent does not have 'analyze_contract' method"
            )
    
    def create_sync_wrapper(self) -> Callable:
        """
        Create a synchronous wrapper function for the agent.
        
        This is useful for environments that don't support async/await.
        
        Returns:
            Synchronous wrapper function
        """
        def sync_execute(agentcore_request: Dict[str, Any]) -> Dict[str, Any]:
            """Synchronous execution wrapper."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    self.execute_with_retry(agentcore_request)
                )
                return result
            finally:
                loop.close()
        
        return sync_execute


def create_wrapper(
    strands_agent: Any,
    agent_name: str,
    gateway_id: Optional[str] = None,
    use_gateway_tools: bool = True,
    **kwargs
) -> AgentCoreWrapper:
    """
    Convenience function to create an AgentCore wrapper.
    
    Args:
        strands_agent: The Strands agent instance to wrap
        agent_name: Name of the agent
        gateway_id: AgentCore Gateway ID for tool invocation (optional)
        use_gateway_tools: Whether to use Gateway tools via MCP (default: True)
        **kwargs: Additional configuration options
        
    Returns:
        Configured AgentCoreWrapper instance
        
    Example:
        >>> wrapper = create_wrapper(
        ...     strands_agent=my_agent,
        ...     agent_name="contract-analysis",
        ...     gateway_id="XXXXXXXXXX",
        ...     use_gateway_tools=True
        ... )
    """
    return AgentCoreWrapper(
        strands_agent,
        agent_name,
        gateway_id=gateway_id,
        use_gateway_tools=use_gateway_tools,
        **kwargs
    )
