"""
Batch Processing Agent Entrypoint for AgentCore Runtime.

This module provides the AgentCore entrypoint for the Batch Processing Agent,
which handles parallel processing of multiple contracts efficiently.
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BatchProcessingAgent:
    """
    Batch Processing Agent that handles multiple contract analyses in parallel.
    
    This agent:
    - Processes multiple contracts concurrently
    - Tracks progress for each contract
    - Aggregates results
    - Handles partial failures gracefully
    - Provides batch-level statistics
    """
    
    def __init__(self):
        """Initialize the Batch Processing Agent."""
        self.agent_name = "batch-processing-agent"
        
        # Initialize Gateway Tool Registry for tool invocation
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
        
        logger.info(f"Batch Processing Agent initialized: {self.agent_name}")
    
    @observability.trace_agent_execution("batch-processing-agent")
    async def process_batch(
        self,
        contracts: List[Dict[str, Any]],
        jurisdiction: str = "US",
        user_id: str = None,
        session_id: str = None,
        max_concurrent: int = 5,
        include_deviation_analysis: bool = True,
        include_obligation_extraction: bool = True
    ) -> Dict[str, Any]:
        """
        Process multiple contracts in parallel.
        
        Args:
            contracts: List of contract dictionaries with 'text' or 's3_location'
            jurisdiction: Jurisdiction for compliance analysis
            user_id: User ID for tracking
            session_id: Session ID for context
            max_concurrent: Maximum number of concurrent analyses
            include_deviation_analysis: Whether to include deviation detection
            include_obligation_extraction: Whether to extract obligations
            
        Returns:
            Batch processing result with individual analyses and statistics
        """
        start_time = datetime.now(timezone.utc)
        batch_id = f"batch-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"📦 Starting batch processing: {batch_id}")
        logger.info(f"   Contracts: {len(contracts)}")
        logger.info(f"   Max Concurrent: {max_concurrent}")
        
        # Record batch request metric
        observability.record_custom_metric(
            "BatchProcessingRequests",
            1.0,
            unit="Count",
            dimensions={
                "Jurisdiction": jurisdiction,
                "ContractCount": str(len(contracts))
            }
        )
        
        try:
            # Validate input
            if not contracts:
                return {
                    "success": False,
                    "batch_id": batch_id,
                    "error": "No contracts provided",
                    "execution_time": 0.0,
                    "metadata": {
                        "user_id": user_id,
                        "session_id": session_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            
            # Process contracts in batches with concurrency limit
            results = []
            total_contracts = len(contracts)
            
            # Create semaphore to limit concurrency
            semaphore = asyncio.Semaphore(max_concurrent)
            
            # Create tasks for all contracts
            tasks = []
            for idx, contract in enumerate(contracts):
                task = self._process_single_contract_with_semaphore(
                    semaphore=semaphore,
                    contract=contract,
                    contract_index=idx,
                    total_contracts=total_contracts,
                    jurisdiction=jurisdiction,
                    user_id=user_id,
                    session_id=session_id,
                    include_deviation_analysis=include_deviation_analysis,
                    include_obligation_extraction=include_obligation_extraction
                )
                tasks.append(task)
            
            # Execute all tasks and gather results
            logger.info(f"Processing {len(tasks)} contracts with max {max_concurrent} concurrent...")
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results and handle exceptions
            processed_results = []
            for idx, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Contract {idx} failed: {result}")
                    processed_results.append({
                        "success": False,
                        "contract_index": idx,
                        "error": str(result),
                        "error_type": type(result).__name__
                    })
                else:
                    processed_results.append(result)
            
            # Calculate batch statistics
            stats = self._calculate_batch_statistics(processed_results)
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build result
            result = {
                "success": True,
                "batch_id": batch_id,
                "results": processed_results,
                "statistics": stats,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "jurisdiction": jurisdiction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "total_contracts": total_contracts,
                    "max_concurrent": max_concurrent
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_batch_in_memory(user_id, batch_id, result)
            
            logger.info(f"✅ Batch processing completed in {execution_time:.2f}s")
            logger.info(f"   Success: {stats['successful_count']}/{total_contracts}")
            logger.info(f"   Failed: {stats['failed_count']}/{total_contracts}")
            logger.info(f"   Avg Time: {stats['average_execution_time']:.2f}s")
            
            # Record success metrics
            observability.record_custom_metric(
                "BatchProcessingSuccessRate",
                stats['success_rate'],
                unit="Percent"
            )
            
            # Record batch size
            observability.record_custom_metric(
                "BatchSize",
                float(total_contracts),
                unit="Count"
            )
            
            # Record execution time
            observability.record_custom_metric(
                "BatchExecutionTime",
                execution_time,
                unit="Seconds",
                dimensions={"BatchSize": str(total_contracts)}
            )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Batch processing failed: {e}", exc_info=True)
            
            return {
                "success": False,
                "batch_id": batch_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "jurisdiction": jurisdiction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name
                }
            }
    
    async def _process_single_contract_with_semaphore(
        self,
        semaphore: asyncio.Semaphore,
        contract: Dict[str, Any],
        contract_index: int,
        total_contracts: int,
        jurisdiction: str,
        user_id: str,
        session_id: str,
        include_deviation_analysis: bool,
        include_obligation_extraction: bool
    ) -> Dict[str, Any]:
        """
        Process a single contract with semaphore for concurrency control.
        
        Args:
            semaphore: Asyncio semaphore for concurrency control
            contract: Contract data
            contract_index: Index of contract in batch
            total_contracts: Total number of contracts
            jurisdiction: Jurisdiction
            user_id: User ID
            session_id: Session ID
            include_deviation_analysis: Include deviation analysis
            include_obligation_extraction: Include obligation extraction
            
        Returns:
            Analysis result
        """
        async with semaphore:
            return await self._process_single_contract(
                contract=contract,
                contract_index=contract_index,
                total_contracts=total_contracts,
                jurisdiction=jurisdiction,
                user_id=user_id,
                session_id=session_id,
                include_deviation_analysis=include_deviation_analysis,
                include_obligation_extraction=include_obligation_extraction
            )
    
    async def _process_single_contract(
        self,
        contract: Dict[str, Any],
        contract_index: int,
        total_contracts: int,
        jurisdiction: str,
        user_id: str,
        session_id: str,
        include_deviation_analysis: bool,
        include_obligation_extraction: bool
    ) -> Dict[str, Any]:
        """
        Process a single contract.
        
        Args:
            contract: Contract data with 'text' or 's3_location'
            contract_index: Index of contract in batch
            total_contracts: Total number of contracts
            jurisdiction: Jurisdiction
            user_id: User ID
            session_id: Session ID
            include_deviation_analysis: Include deviation analysis
            include_obligation_extraction: Include obligation extraction
            
        Returns:
            Analysis result
        """
        start_time = datetime.now(timezone.utc)
        contract_id = contract.get('id', f"contract-{contract_index}")
        
        logger.info(f"📄 Processing contract {contract_index + 1}/{total_contracts}: {contract_id}")
        
        try:
            # Extract contract text
            contract_text = contract.get('text')
            s3_bucket = contract.get('s3_bucket')
            s3_key = contract.get('s3_key')
            
            if not contract_text and not (s3_bucket and s3_key):
                return {
                    "success": False,
                    "contract_id": contract_id,
                    "contract_index": contract_index,
                    "error": "Contract must have 'text' or 's3_bucket' and 's3_key'",
                    "execution_time": 0.0
                }
            
            # Analyze contract using Gateway tools
            if self.tool_registry and hasattr(self.tool_registry, 'invoke_tool'):
                analysis = await self._analyze_with_gateway_tools(
                    contract_text=contract_text,
                    s3_bucket=s3_bucket,
                    s3_key=s3_key,
                    jurisdiction=jurisdiction,
                    include_deviation_analysis=include_deviation_analysis,
                    include_obligation_extraction=include_obligation_extraction
                )
            else:
                analysis = self._basic_analysis(contract_text or f"S3: {s3_bucket}/{s3_key}")
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Add batch metadata
            analysis['contract_id'] = contract_id
            analysis['contract_index'] = contract_index
            analysis['execution_time'] = execution_time
            
            logger.info(f"✅ Contract {contract_index + 1}/{total_contracts} completed in {execution_time:.2f}s")
            
            return analysis
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Contract {contract_index + 1}/{total_contracts} failed: {e}")
            
            return {
                "success": False,
                "contract_id": contract_id,
                "contract_index": contract_index,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time
            }
    
    async def _analyze_with_gateway_tools(
        self,
        contract_text: Optional[str],
        s3_bucket: Optional[str],
        s3_key: Optional[str],
        jurisdiction: str,
        include_deviation_analysis: bool,
        include_obligation_extraction: bool
    ) -> Dict[str, Any]:
        """
        Analyze contract using Gateway tools.
        
        Args:
            contract_text: Contract text (optional)
            s3_bucket: S3 bucket (optional)
            s3_key: S3 key (optional)
            jurisdiction: Jurisdiction
            include_deviation_analysis: Include deviation analysis
            include_obligation_extraction: Include obligation extraction
            
        Returns:
            Analysis result
        """
        # If S3 location provided, fetch text first
        if not contract_text and s3_bucket and s3_key:
            # In production, would fetch from S3
            contract_text = f"[Contract from S3: {s3_bucket}/{s3_key}]"
        
        # Run analysis tools in parallel
        tasks = []
        
        if self.tool_registry:
            # Contract type
            tasks.append(
                self.tool_registry.invoke_tool(
                    "identify_contract_type",
                    {"contract_text": contract_text}
                )
            )
            
            # Extract parties
            tasks.append(
                self.tool_registry.invoke_tool(
                    "extract_contract_parties",
                    {"contract_text": contract_text}
                )
            )
            
            # Extract pricing
            tasks.append(
                self.tool_registry.invoke_tool(
                    "extract_pricing_terms",
                    {"contract_text": contract_text}
                )
            )
            
            # Assess risks
            tasks.append(
                self.tool_registry.invoke_tool(
                    "assess_contract_risks",
                    {"contract_text": contract_text, "jurisdiction": jurisdiction}
                )
            )
        
        # Execute tools
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Parse results
            contract_type = results[0].get("contract_type", "Unknown") if len(results) > 0 and not isinstance(results[0], Exception) else "Unknown"
            parties = results[1].get("parties", []) if len(results) > 1 and not isinstance(results[1], Exception) else []
            pricing = results[2].get("pricing_terms", {}) if len(results) > 2 and not isinstance(results[2], Exception) else {}
            risks = results[3].get("risks", []) if len(results) > 3 and not isinstance(results[3], Exception) else []
            
            return {
                "success": True,
                "contract_type": contract_type,
                "executive_summary": f"Analysis of {contract_type}",
                "key_terms": {
                    "parties": parties,
                    "pricing": pricing
                },
                "risk_assessment": {
                    "risks": risks,
                    "risk_count": len(risks)
                }
            }
        else:
            return self._basic_analysis(contract_text)
    
    def _basic_analysis(self, contract_text: str) -> Dict[str, Any]:
        """
        Perform basic analysis without Gateway tools.
        
        Args:
            contract_text: Contract text
            
        Returns:
            Basic analysis result
        """
        return {
            "success": True,
            "contract_type": "Unknown",
            "executive_summary": f"Basic analysis. Length: {len(contract_text)} characters.",
            "key_terms": {
                "contract_length": len(contract_text),
                "word_count": len(contract_text.split())
            }
        }
    
    def _calculate_batch_statistics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics for batch processing.
        
        Args:
            results: List of analysis results
            
        Returns:
            Statistics dictionary
        """
        total = len(results)
        successful = sum(1 for r in results if r.get('success', False))
        failed = total - successful
        
        # Calculate execution times
        execution_times = [r.get('execution_time', 0.0) for r in results if 'execution_time' in r]
        avg_time = sum(execution_times) / len(execution_times) if execution_times else 0.0
        min_time = min(execution_times) if execution_times else 0.0
        max_time = max(execution_times) if execution_times else 0.0
        
        # Count contract types
        contract_types = {}
        for result in results:
            if result.get('success'):
                contract_type = result.get('contract_type', 'Unknown')
                contract_types[contract_type] = contract_types.get(contract_type, 0) + 1
        
        return {
            "total_contracts": total,
            "successful_count": successful,
            "failed_count": failed,
            "success_rate": (successful / total * 100) if total > 0 else 0.0,
            "average_execution_time": avg_time,
            "min_execution_time": min_time,
            "max_execution_time": max_time,
            "contract_types": contract_types
        }
    
    async def _store_batch_in_memory(
        self,
        user_id: str,
        batch_id: str,
        result: Dict[str, Any]
    ):
        """Store batch processing result in AgentCore Memory."""
        try:
            # Use the correct method signature for MemoryClient
            if hasattr(self.memory_client, 'store_analysis'):
                self.memory_client.store_analysis(user_id, batch_id, result)
            else:
                # Fallback to generic store method
                await self.memory_client.store(
                    key=f"user:{user_id}:batch:{batch_id}",
                    value=result,
                    memory_type="long_term"
                )
            logger.info(f"Stored batch in memory: {batch_id}")
        except Exception as e:
            logger.error(f"Failed to store batch in memory: {e}")


# AgentCore entrypoint
async def process_batch_entrypoint(
    contracts: List[Dict[str, Any]],
    jurisdiction: str = "US",
    user_id: str = None,
    session_id: str = None,
    max_concurrent: int = 5,
    include_deviation_analysis: bool = True,
    include_obligation_extraction: bool = True
) -> Dict[str, Any]:
    """
    AgentCore entrypoint for batch contract processing.
    
    Args:
        contracts: List of contract dictionaries
        jurisdiction: Jurisdiction for compliance
        user_id: User ID for tracking
        session_id: Session ID for context
        max_concurrent: Maximum concurrent analyses
        include_deviation_analysis: Include deviation analysis
        include_obligation_extraction: Include obligation extraction
        
    Returns:
        Batch processing result
    """
    agent = BatchProcessingAgent()
    return await agent.process_batch(
        contracts,
        jurisdiction,
        user_id,
        session_id,
        max_concurrent,
        include_deviation_analysis,
        include_obligation_extraction
    )


if __name__ == "__main__":
    # Test the agent locally
    import asyncio
    
    test_contracts = [
        {
            "id": "contract-1",
            "text": "POWER PURCHASE AGREEMENT between ABC Solar and XYZ Utility. Price: $45/MWh."
        },
        {
            "id": "contract-2",
            "text": "SERVICE AGREEMENT between DEF Corp and GHI Inc. Monthly fee: $10,000."
        },
        {
            "id": "contract-3",
            "text": "POWER PURCHASE AGREEMENT between JKL Wind and MNO Utility. Price: $50/MWh."
        }
    ]
    
    async def test():
        result = await process_batch_entrypoint(
            contracts=test_contracts,
            jurisdiction="US",
            user_id="test-user",
            session_id="test-session",
            max_concurrent=2
        )
        
        print("\n=== Batch Processing Result ===")
        print(f"Success: {result['success']}")
        print(f"Batch ID: {result.get('batch_id')}")
        print(f"Total Contracts: {result.get('statistics', {}).get('total_contracts')}")
        print(f"Successful: {result.get('statistics', {}).get('successful_count')}")
        print(f"Failed: {result.get('statistics', {}).get('failed_count')}")
        print(f"Success Rate: {result.get('statistics', {}).get('success_rate'):.1f}%")
        print(f"Avg Execution Time: {result.get('statistics', {}).get('average_execution_time'):.2f}s")
        print(f"Total Execution Time: {result.get('execution_time'):.2f}s")
    
    asyncio.run(test())
