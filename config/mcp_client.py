"""
MCP (Model Context Protocol) Client for AgentCore Gateway.

This module provides a client for invoking tools through the AgentCore Gateway
using the Model Context Protocol.
"""

import logging
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class MCPError(Exception):
    """Base exception for MCP client errors."""
    pass


class ToolNotFoundError(MCPError):
    """Tool not found in Gateway."""
    pass


class ToolInvocationError(MCPError):
    """Error during tool invocation."""
    pass


class AuthenticationError(MCPError):
    """Authentication error."""
    pass


class MCPClient:
    """
    Client for invoking tools through AgentCore Gateway using MCP protocol.
    
    The Model Context Protocol (MCP) provides a standardized way for agents
    to discover and invoke tools through the Gateway.
    """
    
    def __init__(
        self,
        gateway_id: str,
        region: str = "us-east-1",
        oauth_token: Optional[str] = None
    ):
        """
        Initialize MCP client.
        
        Args:
            gateway_id: AgentCore Gateway ID
            region: AWS region
            oauth_token: OAuth token for authentication (optional)
        """
        self.gateway_id = gateway_id
        self.region = region
        self.oauth_token = oauth_token
        
        # Initialize AWS clients
        self.bedrock_agent_runtime = boto3.client(
            'bedrock-agent-runtime',
            region_name=region
        )
        self.lambda_client = boto3.client('lambda', region_name=region)
        
        logger.info(f"Initialized MCP client for gateway: {gateway_id}")
    
    def set_oauth_token(self, token: str):
        """Set OAuth token for authentication."""
        self.oauth_token = token
        logger.debug("OAuth token updated")
    
    def discover_tools(self, query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Discover available tools using semantic search.
        
        Args:
            query: Natural language query to find relevant tools (optional)
            
        Returns:
            List of tool definitions
            
        Example:
            >>> tools = client.discover_tools("extract pricing information")
            >>> print(tools[0]['name'])
            'extract_pricing_terms'
        """
        try:
            logger.info(f"Discovering tools with query: {query or 'all'}")
            
            # Note: This is a placeholder implementation
            # The actual AgentCore Gateway API for tool discovery may differ
            
            # For now, we'll use the tool registry directly
            from config.gateway_tool_registry import GatewayToolRegistry
            
            registry = GatewayToolRegistry(self.gateway_id, self.region)
            
            if query:
                tools = registry.search_tools(query)
            else:
                tools = registry.list_tools()
            
            logger.info(f"Discovered {len(tools)} tool(s)")
            return tools
            
        except Exception as e:
            logger.error(f"Tool discovery failed: {str(e)}")
            raise MCPError(f"Failed to discover tools: {str(e)}") from e
    
    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific tool.
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Tool definition with parameters and examples
            
        Raises:
            ToolNotFoundError: If tool is not found
        """
        try:
            from config.gateway_tool_registry import GatewayToolRegistry
            
            registry = GatewayToolRegistry(self.gateway_id, self.region)
            tool_info = registry.get_tool_info(tool_name)
            
            if not tool_info:
                raise ToolNotFoundError(f"Tool '{tool_name}' not found in Gateway")
            
            return tool_info
            
        except ToolNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to get tool info: {str(e)}")
            raise MCPError(f"Failed to get tool info: {str(e)}") from e
    
    def invoke_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Invoke a tool through the Gateway using MCP protocol.
        
        Args:
            tool_name: Name of the tool to invoke
            arguments: Tool arguments
            timeout: Invocation timeout in seconds
            
        Returns:
            Tool execution result
            
        Raises:
            ToolNotFoundError: If tool is not found
            ToolInvocationError: If invocation fails
            AuthenticationError: If authentication fails
            
        Example:
            >>> result = client.invoke_tool(
            ...     'extract_pricing_terms',
            ...     {'contract_text': 'POWER PURCHASE AGREEMENT...'}
            ... )
            >>> print(result['pricing_terms'])
        """
        try:
            invocation_id = str(uuid.uuid4())
            start_time = datetime.now(timezone.utc)
            
            logger.info(
                f"Invoking tool: {tool_name} "
                f"(invocation_id={invocation_id})"
            )
            
            # Get tool information
            tool_info = self.get_tool_info(tool_name)
            lambda_arn = tool_info.get('lambda_arn')
            
            if not lambda_arn:
                raise ToolInvocationError(
                    f"Lambda ARN not found for tool '{tool_name}'"
                )
            
            # Validate arguments against tool schema
            self._validate_arguments(tool_info, arguments)
            
            # Build MCP request
            mcp_request = {
                'method': 'tools/call',
                'params': {
                    'name': tool_name,
                    'arguments': arguments
                },
                'metadata': {
                    'invocation_id': invocation_id,
                    'timestamp': start_time.isoformat(),
                    'gateway_id': self.gateway_id
                }
            }
            
            # Add OAuth token if available
            if self.oauth_token:
                mcp_request['metadata']['oauth_token'] = self.oauth_token
            
            # Invoke Lambda function directly
            # In production, this would go through the Gateway
            logger.debug(f"Invoking Lambda: {lambda_arn}")
            
            response = self.lambda_client.invoke(
                FunctionName=lambda_arn,
                InvocationType='RequestResponse',
                Payload=json.dumps(arguments)
            )
            
            # Parse response
            payload = json.loads(response['Payload'].read())
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Check for Lambda errors
            if response.get('FunctionError'):
                error_message = payload.get('errorMessage', 'Unknown error')
                logger.error(f"Tool invocation failed: {error_message}")
                raise ToolInvocationError(
                    f"Tool '{tool_name}' failed: {error_message}"
                )
            
            # Build MCP response
            mcp_response = {
                'success': True,
                'tool_name': tool_name,
                'invocation_id': invocation_id,
                'result': payload,
                'execution_time': execution_time,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(
                f"Tool invocation completed: {tool_name} "
                f"(time={execution_time:.2f}s)"
            )
            
            return mcp_response
            
        except ToolNotFoundError:
            raise
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            
            if error_code in ['AccessDeniedException', 'UnauthorizedException']:
                raise AuthenticationError(
                    f"Authentication failed for tool '{tool_name}': {str(e)}"
                ) from e
            
            raise ToolInvocationError(
                f"Failed to invoke tool '{tool_name}': {str(e)}"
            ) from e
        except Exception as e:
            logger.error(f"Tool invocation error: {str(e)}")
            raise ToolInvocationError(
                f"Failed to invoke tool '{tool_name}': {str(e)}"
            ) from e
    
    def invoke_tools_batch(
        self,
        tool_calls: List[Dict[str, Any]],
        parallel: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Invoke multiple tools in batch.
        
        Args:
            tool_calls: List of tool calls with 'name' and 'arguments'
            parallel: Whether to invoke tools in parallel
            
        Returns:
            List of tool execution results
            
        Example:
            >>> results = client.invoke_tools_batch([
            ...     {'name': 'extract_parties', 'arguments': {'contract_text': '...'}},
            ...     {'name': 'extract_pricing', 'arguments': {'contract_text': '...'}}
            ... ])
        """
        results = []
        
        logger.info(f"Invoking {len(tool_calls)} tools in batch (parallel={parallel})")
        
        if parallel:
            # In production, this would use asyncio or threading
            # For now, we'll invoke sequentially
            for tool_call in tool_calls:
                try:
                    result = self.invoke_tool(
                        tool_call['name'],
                        tool_call['arguments']
                    )
                    results.append(result)
                except Exception as e:
                    logger.error(f"Batch tool invocation failed: {str(e)}")
                    results.append({
                        'success': False,
                        'tool_name': tool_call['name'],
                        'error': str(e)
                    })
        else:
            # Sequential invocation
            for tool_call in tool_calls:
                try:
                    result = self.invoke_tool(
                        tool_call['name'],
                        tool_call['arguments']
                    )
                    results.append(result)
                except Exception as e:
                    logger.error(f"Batch tool invocation failed: {str(e)}")
                    results.append({
                        'success': False,
                        'tool_name': tool_call['name'],
                        'error': str(e)
                    })
        
        logger.info(f"Batch invocation completed: {len(results)} results")
        return results
    
    def _validate_arguments(
        self,
        tool_info: Dict[str, Any],
        arguments: Dict[str, Any]
    ):
        """
        Validate tool arguments against schema.
        
        Args:
            tool_info: Tool definition with parameters
            arguments: Arguments to validate
            
        Raises:
            ToolInvocationError: If validation fails
        """
        parameters = tool_info.get('parameters', [])
        
        # Check required parameters
        for param in parameters:
            if param.get('required', True):
                if param['name'] not in arguments:
                    raise ToolInvocationError(
                        f"Missing required parameter: {param['name']}"
                    )
        
        # Check for unknown parameters
        param_names = {p['name'] for p in parameters}
        for arg_name in arguments.keys():
            if arg_name not in param_names:
                logger.warning(f"Unknown parameter: {arg_name}")
    
    def get_invocation_history(
        self,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent tool invocation history.
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of invocation records
        """
        # This would query the observability system in production
        # For now, return empty list
        logger.info("Invocation history not yet implemented")
        return []


def create_mcp_client(
    gateway_id: str,
    region: str = "us-east-1",
    oauth_token: Optional[str] = None
) -> MCPClient:
    """
    Convenience function to create an MCP client.
    
    Args:
        gateway_id: AgentCore Gateway ID
        region: AWS region
        oauth_token: OAuth token for authentication
        
    Returns:
        Configured MCPClient instance
    """
    return MCPClient(gateway_id, region, oauth_token)
