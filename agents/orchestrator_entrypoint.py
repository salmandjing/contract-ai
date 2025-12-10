"""
Orchestrator Agent Entrypoint for AgentCore Runtime.

This module provides the AgentCore entrypoint for the Orchestrator Agent,
which routes requests to specialized agents and aggregates results.
"""

import os
import sys
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.agentcore_wrapper import AgentCoreWrapper
from config.gateway_tool_registry import GatewayToolRegistry
from config.memory_client import MemoryClient
from config.observability import ObservabilityInstrumentation, observability

# Import specialized agent entrypoints
from agents.contract_analysis_entrypoint import analyze_contract
from agents.contract_comparison_entrypoint import compare_contracts_entrypoint
from agents.obligation_extraction_entrypoint import extract_obligations_entrypoint
from agents.batch_processing_entrypoint import process_batch_entrypoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OrchestratorAgent:
    """
    Orchestrator Agent that routes requests to specialized agents.
    
    This agent:
    - Analyzes incoming requests to determine intent
    - Routes to appropriate specialized agent(s)
    - Coordinates multi-agent workflows
    - Aggregates results from multiple agents
    - Provides unified response format
    """
    
    def __init__(self):
        """Initialize the Orchestrator Agent."""
        self.agent_name = "orchestrator-agent"
        
        # Initialize Gateway Tool Registry
        gateway_id = os.getenv('AGENTCORE_GATEWAY_ID')
        if gateway_id:
            self.tool_registry = GatewayToolRegistry(gateway_id)
            logger.info(f"Initialized Gateway Tool Registry with gateway_id={gateway_id}")
        else:
            self.tool_registry = None
            logger.warning("AGENTCORE_GATEWAY_ID not set, tool registry disabled")
        
        # Initialize Memory Client
        self.memory_client = MemoryClient()
        logger.info("Initialized Memory Client")
        
        # Initialize Observability
        self.observability = ObservabilityInstrumentation(
            service_name=self.agent_name
        )
        logger.info("Initialized Observability Instrumentation")
        
        # Agent routing map
        self.agent_routes = {
            'analyze': analyze_contract,
            'compare': compare_contracts_entrypoint,
            'extract_obligations': extract_obligations_entrypoint,
            'batch': process_batch_entrypoint
        }
        
        logger.info(f"Orchestrator Agent initialized: {self.agent_name}")
        logger.info(f"Available routes: {list(self.agent_routes.keys())}")
    
    @observability.trace_agent_execution("orchestrator-agent")
    async def orchestrate(
        self,
        request_type: str,
        request_data: Dict[str, Any],
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Orchestrate request routing to specialized agents.
        
        Args:
            request_type: Type of request (analyze, compare, extract_obligations, batch)
            request_data: Request data specific to the agent
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Orchestrated result with agent responses
        """
        start_time = datetime.now(timezone.utc)
        orchestration_id = f"orchestration-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"🎯 Starting orchestration: {orchestration_id}")
        logger.info(f"   Request Type: {request_type}")
        logger.info(f"   User ID: {user_id}")
        
        # Record orchestration request metric
        observability.record_custom_metric(
            "OrchestrationRequests",
            1.0,
            unit="Count",
            dimensions={"RequestType": request_type}
        )
        
        try:
            # Validate request type
            if request_type not in self.agent_routes:
                return {
                    "success": False,
                    "orchestration_id": orchestration_id,
                    "error": f"Unknown request type: {request_type}",
                    "available_types": list(self.agent_routes.keys()),
                    "execution_time": 0.0,
                    "metadata": {
                        "user_id": user_id,
                        "session_id": session_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            
            # Add user_id and session_id to request data
            request_data['user_id'] = user_id
            request_data['session_id'] = session_id
            
            # Route to appropriate agent
            logger.info(f"Routing to {request_type} agent...")
            agent_function = self.agent_routes[request_type]
            
            # Execute agent
            agent_result = await agent_function(**request_data)
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build orchestrated result
            result = {
                "success": True,
                "orchestration_id": orchestration_id,
                "request_type": request_type,
                "agent_result": agent_result,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "routed_to": request_type
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_orchestration_in_memory(user_id, orchestration_id, result)
            
            logger.info(f"✅ Orchestration completed in {execution_time:.2f}s")
            
            # Record success metrics
            observability.record_custom_metric(
                "OrchestrationSuccessRate",
                100.0,
                unit="Percent",
                dimensions={"RequestType": request_type}
            )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Orchestration failed: {e}", exc_info=True)
            
            # Record failure metrics
            observability.record_custom_metric(
                "OrchestrationSuccessRate",
                0.0,
                unit="Percent",
                dimensions={"RequestType": request_type}
            )
            
            return {
                "success": False,
                "orchestration_id": orchestration_id,
                "request_type": request_type,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name
                }
            }
    
    @observability.trace_agent_execution("orchestrator-multi-agent")
    async def orchestrate_multi_agent_workflow(
        self,
        workflow_type: str,
        workflow_data: Dict[str, Any],
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Orchestrate multi-agent workflows where multiple agents work together.
        
        Args:
            workflow_type: Type of workflow (analyze_and_extract, compare_and_extract, etc.)
            workflow_data: Workflow data
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Aggregated results from multiple agents
        """
        start_time = datetime.now(timezone.utc)
        workflow_id = f"workflow-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"🔄 Starting multi-agent workflow: {workflow_id}")
        logger.info(f"   Workflow Type: {workflow_type}")
        
        try:
            results = {}
            
            if workflow_type == "analyze_and_extract":
                # First analyze the contract
                logger.info("Step 1: Analyzing contract...")
                analysis_result = await analyze_contract(
                    contract_text=workflow_data.get('contract_text'),
                    jurisdiction=workflow_data.get('jurisdiction', 'US'),
                    user_id=user_id,
                    session_id=session_id
                )
                results['analysis'] = analysis_result
                
                # Then extract obligations
                if analysis_result.get('success'):
                    logger.info("Step 2: Extracting obligations...")
                    obligations_result = await extract_obligations_entrypoint(
                        contract_text=workflow_data.get('contract_text'),
                        contract_type=analysis_result.get('contract_type'),
                        user_id=user_id,
                        session_id=session_id
                    )
                    results['obligations'] = obligations_result
            
            elif workflow_type == "compare_and_extract":
                # Compare two contracts
                logger.info("Step 1: Comparing contracts...")
                comparison_result = await compare_contracts_entrypoint(
                    contract_a_text=workflow_data.get('contract_a_text'),
                    contract_b_text=workflow_data.get('contract_b_text'),
                    jurisdiction=workflow_data.get('jurisdiction', 'US'),
                    user_id=user_id,
                    session_id=session_id
                )
                results['comparison'] = comparison_result
                
                # Extract obligations from both
                if comparison_result.get('success'):
                    logger.info("Step 2: Extracting obligations from both contracts...")
                    
                    obligations_a_task = extract_obligations_entrypoint(
                        contract_text=workflow_data.get('contract_a_text'),
                        user_id=user_id,
                        session_id=session_id
                    )
                    
                    obligations_b_task = extract_obligations_entrypoint(
                        contract_text=workflow_data.get('contract_b_text'),
                        user_id=user_id,
                        session_id=session_id
                    )
                    
                    obligations_results = await asyncio.gather(
                        obligations_a_task,
                        obligations_b_task,
                        return_exceptions=True
                    )
                    
                    results['obligations_a'] = obligations_results[0]
                    results['obligations_b'] = obligations_results[1]
            
            elif workflow_type == "batch_analyze_and_aggregate":
                # Batch process contracts
                logger.info("Step 1: Batch processing contracts...")
                batch_result = await process_batch_entrypoint(
                    contracts=workflow_data.get('contracts', []),
                    jurisdiction=workflow_data.get('jurisdiction', 'US'),
                    user_id=user_id,
                    session_id=session_id,
                    max_concurrent=workflow_data.get('max_concurrent', 5)
                )
                results['batch'] = batch_result
                
                # Aggregate statistics
                if batch_result.get('success'):
                    logger.info("Step 2: Aggregating statistics...")
                    results['aggregated_stats'] = self._aggregate_batch_statistics(
                        batch_result.get('results', [])
                    )
            
            else:
                return {
                    "success": False,
                    "workflow_id": workflow_id,
                    "error": f"Unknown workflow type: {workflow_type}",
                    "available_workflows": [
                        "analyze_and_extract",
                        "compare_and_extract",
                        "batch_analyze_and_aggregate"
                    ]
                }
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build workflow result
            result = {
                "success": True,
                "workflow_id": workflow_id,
                "workflow_type": workflow_type,
                "results": results,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "agents_involved": list(results.keys())
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_orchestration_in_memory(user_id, workflow_id, result)
            
            logger.info(f"✅ Multi-agent workflow completed in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Multi-agent workflow failed: {e}", exc_info=True)
            
            return {
                "success": False,
                "workflow_id": workflow_id,
                "workflow_type": workflow_type,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name
                }
            }
    
    def _aggregate_batch_statistics(self, batch_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate statistics from batch processing results.
        
        Args:
            batch_results: List of batch processing results
            
        Returns:
            Aggregated statistics
        """
        aggregated = {
            "total_contracts": len(batch_results),
            "successful": 0,
            "failed": 0,
            "contract_types": {},
            "total_risks": 0,
            "average_risk_score": 0.0,
            "total_obligations": 0
        }
        
        risk_scores = []
        
        for result in batch_results:
            if result.get('success'):
                aggregated["successful"] += 1
                
                # Count contract types
                contract_type = result.get('contract_type', 'Unknown')
                aggregated["contract_types"][contract_type] = \
                    aggregated["contract_types"].get(contract_type, 0) + 1
                
                # Count risks
                risks = result.get('risk_assessment', {}).get('risks', [])
                aggregated["total_risks"] += len(risks)
                
                # Collect risk scores
                risk_score = result.get('risk_assessment', {}).get('risk_score', 0)
                if risk_score > 0:
                    risk_scores.append(risk_score)
                
                # Count obligations
                obligations = result.get('obligations', [])
                aggregated["total_obligations"] += len(obligations)
            else:
                aggregated["failed"] += 1
        
        # Calculate average risk score
        if risk_scores:
            aggregated["average_risk_score"] = sum(risk_scores) / len(risk_scores)
        
        return aggregated
    
    async def _store_orchestration_in_memory(
        self,
        user_id: str,
        orchestration_id: str,
        result: Dict[str, Any]
    ):
        """Store orchestration result in AgentCore Memory."""
        try:
            # Use the correct method signature for MemoryClient
            if hasattr(self.memory_client, 'store_analysis'):
                self.memory_client.store_analysis(user_id, orchestration_id, result)
            else:
                # Fallback to generic store method
                await self.memory_client.store(
                    key=f"user:{user_id}:orchestration:{orchestration_id}",
                    value=result,
                    memory_type="long_term"
                )
            logger.info(f"Stored orchestration in memory: {orchestration_id}")
        except Exception as e:
            logger.error(f"Failed to store orchestration in memory: {e}")


# AgentCore entrypoints
async def orchestrate_entrypoint(
    request_type: str,
    request_data: Dict[str, Any],
    user_id: str = None,
    session_id: str = None
) -> Dict[str, Any]:
    """
    AgentCore entrypoint for orchestration.
    
    Args:
        request_type: Type of request (analyze, compare, extract_obligations, batch)
        request_data: Request data specific to the agent
        user_id: User ID for tracking
        session_id: Session ID for context
        
    Returns:
        Orchestrated result
    """
    agent = OrchestratorAgent()
    return await agent.orchestrate(
        request_type,
        request_data,
        user_id,
        session_id
    )


async def orchestrate_multi_agent_entrypoint(
    workflow_type: str,
    workflow_data: Dict[str, Any],
    user_id: str = None,
    session_id: str = None
) -> Dict[str, Any]:
    """
    AgentCore entrypoint for multi-agent workflows.
    
    Args:
        workflow_type: Type of workflow
        workflow_data: Workflow data
        user_id: User ID for tracking
        session_id: Session ID for context
        
    Returns:
        Workflow result with aggregated agent responses
    """
    agent = OrchestratorAgent()
    return await agent.orchestrate_multi_agent_workflow(
        workflow_type,
        workflow_data,
        user_id,
        session_id
    )


if __name__ == "__main__":
    # Test the agent locally
    import asyncio
    
    test_contract = """
    POWER PURCHASE AGREEMENT
    
    This agreement is between ABC Solar LLC and XYZ Utility Company.
    Price: $45/MWh for 20 years.
    The Seller shall deliver electricity to the Buyer.
    The Buyer shall make payments within 30 days.
    """
    
    async def test_single_agent():
        print("\n=== Testing Single Agent Orchestration ===")
        result = await orchestrate_entrypoint(
            request_type="analyze",
            request_data={
                "contract_text": test_contract,
                "jurisdiction": "US"
            },
            user_id="test-user",
            session_id="test-session"
        )
        
        print(f"Success: {result['success']}")
        print(f"Orchestration ID: {result.get('orchestration_id')}")
        print(f"Request Type: {result.get('request_type')}")
        print(f"Execution Time: {result.get('execution_time'):.2f}s")
    
    async def test_multi_agent():
        print("\n=== Testing Multi-Agent Workflow ===")
        result = await orchestrate_multi_agent_entrypoint(
            workflow_type="analyze_and_extract",
            workflow_data={
                "contract_text": test_contract,
                "jurisdiction": "US"
            },
            user_id="test-user",
            session_id="test-session"
        )
        
        print(f"Success: {result['success']}")
        print(f"Workflow ID: {result.get('workflow_id')}")
        print(f"Workflow Type: {result.get('workflow_type')}")
        print(f"Agents Involved: {result.get('metadata', {}).get('agents_involved')}")
        print(f"Execution Time: {result.get('execution_time'):.2f}s")
    
    async def test():
        await test_single_agent()
        await test_multi_agent()
    
    asyncio.run(test())
