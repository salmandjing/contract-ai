"""
Obligation Extraction Agent Entrypoint for AgentCore Runtime.

This module provides the AgentCore entrypoint for the Obligation Extraction Agent,
which extracts, classifies, and tracks contractual obligations.
"""

import os
import sys
import logging
import asyncio
from typing import Dict, Any, List
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


class ObligationExtractionAgent:
    """
    Obligation Extraction Agent that identifies and tracks contractual obligations.
    
    This agent:
    - Extracts all obligations from contract text
    - Classifies obligations by type (payment, delivery, renewal, etc.)
    - Identifies responsible parties
    - Extracts deadlines and dates
    - Assesses priority levels
    - Tracks obligations for compliance
    """
    
    def __init__(self):
        """Initialize the Obligation Extraction Agent."""
        self.agent_name = "obligation-extraction-agent"
        
        # Initialize Lambda client for tool invocation
        import boto3
        self.lambda_client = boto3.client('lambda', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        logger.info("Initialized Lambda client for tool invocation")
        
        # Initialize Memory Client
        self.memory_client = MemoryClient()
        logger.info("Initialized Memory Client")
        
        # Initialize Observability
        self.observability = ObservabilityInstrumentation(
            service_name=self.agent_name
        )
        logger.info("Initialized Observability Instrumentation")
        
        logger.info(f"Obligation Extraction Agent initialized: {self.agent_name}")
    
    @observability.trace_agent_execution("obligation-extraction-agent")
    async def extract_obligations(
        self,
        contract_text: str,
        contract_type: str = None,
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Extract and classify obligations from contract text.
        
        Args:
            contract_text: Contract text to analyze
            contract_type: Type of contract (optional, helps with classification)
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Extraction result with identified obligations
        """
        start_time = datetime.now(timezone.utc)
        extraction_id = f"obligation-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"📋 Starting obligation extraction: {extraction_id}")
        
        # Record extraction request metric
        observability.record_custom_metric(
            "ObligationExtractionRequests",
            1.0,
            unit="Count",
            dimensions={"ContractType": contract_type or "Unknown"}
        )
        
        try:
            # Extract obligations using Gateway tools if available
            if self.tool_registry:
                obligations = await self._extract_with_gateway_tools(contract_text)
            else:
                obligations = self._extract_with_heuristics(contract_text)
            
            # Classify and enrich obligations
            logger.info(f"Classifying {len(obligations)} obligations...")
            enriched_obligations = await self._enrich_obligations(obligations, contract_text)
            
            # Calculate statistics
            stats = self._calculate_statistics(enriched_obligations)
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build result
            result = {
                "success": True,
                "extraction_id": extraction_id,
                "obligations": enriched_obligations,
                "statistics": stats,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "contract_type": contract_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "obligation_count": len(enriched_obligations)
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_obligations_in_memory(user_id, extraction_id, result)
            
            logger.info(f"✅ Extracted {len(enriched_obligations)} obligations in {execution_time:.2f}s")
            
            # Record success metrics
            observability.record_custom_metric(
                "ObligationExtractionSuccessRate",
                100.0,
                unit="Percent"
            )
            
            # Record obligation count
            observability.record_custom_metric(
                "ObligationsExtracted",
                float(len(enriched_obligations)),
                unit="Count",
                dimensions={"ContractType": contract_type or "Unknown"}
            )
            
            # Record obligations by type
            for obligation_type, count in stats.get("by_type", {}).items():
                observability.record_custom_metric(
                    "ObligationsByType",
                    float(count),
                    unit="Count",
                    dimensions={"ObligationType": obligation_type}
                )
            
            # Record obligations by priority
            for priority, count in stats.get("by_priority", {}).items():
                observability.record_custom_metric(
                    "ObligationsByPriority",
                    float(count),
                    unit="Count",
                    dimensions={"Priority": priority}
                )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Obligation extraction failed: {e}", exc_info=True)
            
            return {
                "success": False,
                "extraction_id": extraction_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "contract_type": contract_type,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name
                }
            }
    
    async def _extract_with_gateway_tools(self, contract_text: str) -> List[Dict[str, Any]]:
        """
        Extract obligations using Gateway tools.
        
        Args:
            contract_text: Contract text
            
        Returns:
            List of extracted obligations
        """
        obligations = []
        
        try:
            # For now, use heuristic-based extraction
            # TODO: Implement proper Lambda tool invocation when needed
            obligations = self._extract_with_heuristics(contract_text)
        except Exception as e:
            logger.warning(f"Obligation extraction failed: {e}, using fallback")
            obligations = self._extract_with_heuristics(contract_text)
        
        return obligations
    
    def _extract_with_heuristics(self, contract_text: str) -> List[Dict[str, Any]]:
        """
        Extract obligations using heuristic-based approach.
        
        Args:
            contract_text: Contract text
            
        Returns:
            List of extracted obligations
        """
        obligations = []
        
        # Keywords that indicate obligations
        obligation_keywords = [
            "shall", "must", "will", "required to", "obligated to",
            "responsible for", "agrees to", "undertakes to", "commits to"
        ]
        
        # Split into sentences
        sentences = contract_text.split(".")
        
        for idx, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Check if sentence contains obligation keywords
            sentence_lower = sentence.lower()
            for keyword in obligation_keywords:
                if keyword in sentence_lower:
                    obligation = {
                        "id": str(uuid.uuid4()),
                        "description": sentence,
                        "clause_text": sentence,
                        "keyword": keyword,
                        "sentence_index": idx
                    }
                    obligations.append(obligation)
                    break
        
        logger.info(f"Extracted {len(obligations)} obligations using heuristics")
        return obligations
    
    async def _enrich_obligations(
        self,
        obligations: List[Dict[str, Any]],
        contract_text: str
    ) -> List[Dict[str, Any]]:
        """
        Enrich obligations with classification, parties, dates, and priority.
        
        Args:
            obligations: List of raw obligations
            contract_text: Full contract text for context
            
        Returns:
            List of enriched obligations
        """
        enriched = []
        
        for obligation in obligations:
            enriched_obligation = obligation.copy()
            
            # Classify obligation type
            enriched_obligation["type"] = self._classify_obligation_type(
                obligation.get("description", "")
            )
            
            # Extract responsible party
            enriched_obligation["responsible_party"] = self._identify_responsible_party(
                obligation.get("description", "")
            )
            
            # Extract dates/deadlines
            enriched_obligation["deadline"] = self._extract_deadline(
                obligation.get("description", "")
            )
            
            # Assess priority
            enriched_obligation["priority"] = self._assess_priority(
                obligation.get("description", ""),
                enriched_obligation["type"]
            )
            
            # Add confidence score
            enriched_obligation["confidence"] = self._calculate_confidence(
                enriched_obligation
            )
            
            enriched.append(enriched_obligation)
        
        return enriched
    
    def _classify_obligation_type(self, description: str) -> str:
        """
        Classify the type of obligation.
        
        Args:
            description: Obligation description
            
        Returns:
            Obligation type
        """
        description_lower = description.lower()
        
        # Payment obligations
        if any(word in description_lower for word in ["pay", "payment", "invoice", "fee", "price"]):
            return "payment"
        
        # Insurance obligations (check before maintenance to avoid "maintain insurance" matching maintenance)
        if any(word in description_lower for word in ["insure", "insurance", "coverage"]):
            return "insurance"
        
        # Delivery obligations
        if any(word in description_lower for word in ["deliver", "provide", "supply", "furnish"]):
            return "delivery"
        
        # Renewal obligations
        if any(word in description_lower for word in ["renew", "renewal", "extend", "extension"]):
            return "renewal"
        
        # Termination obligations
        if any(word in description_lower for word in ["terminate", "termination", "cancel", "cancellation"]):
            return "termination"
        
        # Reporting obligations
        if any(word in description_lower for word in ["report", "reporting", "notify", "notification"]):
            return "reporting"
        
        # Maintenance obligations
        if any(word in description_lower for word in ["maintain", "maintenance", "service", "support"]):
            return "maintenance"
        
        # Compliance obligations
        if any(word in description_lower for word in ["comply", "compliance", "regulation", "regulatory"]):
            return "compliance"
        
        # Warranty obligations
        if any(word in description_lower for word in ["warrant", "warranty", "guarantee"]):
            return "warranty"
        
        return "general"
    
    def _identify_responsible_party(self, description: str) -> str:
        """
        Identify the party responsible for the obligation.
        
        Args:
            description: Obligation description
            
        Returns:
            Responsible party identifier
        """
        description_lower = description.lower()
        
        # Common party identifiers
        if any(word in description_lower for word in ["seller", "vendor", "supplier", "provider"]):
            return "seller"
        
        if any(word in description_lower for word in ["buyer", "purchaser", "customer", "client"]):
            return "buyer"
        
        if "party a" in description_lower or "first party" in description_lower:
            return "party_a"
        
        if "party b" in description_lower or "second party" in description_lower:
            return "party_b"
        
        return "unspecified"
    
    def _extract_deadline(self, description: str) -> Dict[str, Any]:
        """
        Extract deadline information from obligation description.
        
        Args:
            description: Obligation description
            
        Returns:
            Deadline information
        """
        description_lower = description.lower()
        
        # Look for time-based keywords
        deadline_info = {
            "has_deadline": False,
            "deadline_text": None,
            "deadline_type": None
        }
        
        # Specific date patterns
        if any(word in description_lower for word in ["by", "before", "no later than", "within"]):
            deadline_info["has_deadline"] = True
            deadline_info["deadline_type"] = "specific"
            
            # Extract the deadline text (simplified)
            for word in ["by", "before", "no later than", "within"]:
                if word in description_lower:
                    idx = description_lower.index(word)
                    deadline_info["deadline_text"] = description[idx:idx+50]
                    break
        
        # Recurring deadlines
        if any(word in description_lower for word in ["monthly", "quarterly", "annually", "yearly"]):
            deadline_info["has_deadline"] = True
            deadline_info["deadline_type"] = "recurring"
        
        return deadline_info
    
    def _assess_priority(self, description: str, obligation_type: str) -> str:
        """
        Assess the priority level of an obligation.
        
        Args:
            description: Obligation description
            obligation_type: Type of obligation
            
        Returns:
            Priority level (critical/high/medium/low)
        """
        description_lower = description.lower()
        
        # Critical priority indicators
        if any(word in description_lower for word in ["immediately", "urgent", "critical", "essential"]):
            return "critical"
        
        # High priority types
        if obligation_type in ["payment", "termination", "compliance"]:
            return "high"
        
        # High priority keywords
        if any(word in description_lower for word in ["must", "shall", "required"]):
            return "high"
        
        # Medium priority types
        if obligation_type in ["reporting", "notification", "renewal"]:
            return "medium"
        
        # Default to low
        return "low"
    
    def _calculate_confidence(self, obligation: Dict[str, Any]) -> float:
        """
        Calculate confidence score for obligation extraction.
        
        Args:
            obligation: Enriched obligation
            
        Returns:
            Confidence score (0.0 to 1.0)
        """
        confidence = 0.5  # Base confidence
        
        # Increase confidence if we have clear indicators
        if obligation.get("keyword"):
            confidence += 0.2
        
        if obligation.get("type") != "general":
            confidence += 0.1
        
        if obligation.get("responsible_party") != "unspecified":
            confidence += 0.1
        
        if obligation.get("deadline", {}).get("has_deadline"):
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def _calculate_statistics(self, obligations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics about extracted obligations.
        
        Args:
            obligations: List of obligations
            
        Returns:
            Statistics dictionary
        """
        stats = {
            "total_obligations": len(obligations),
            "by_type": {},
            "by_priority": {},
            "by_party": {},
            "with_deadlines": 0,
            "average_confidence": 0.0
        }
        
        if not obligations:
            return stats
        
        # Count by type
        for obligation in obligations:
            obligation_type = obligation.get("type", "general")
            stats["by_type"][obligation_type] = stats["by_type"].get(obligation_type, 0) + 1
            
            # Count by priority
            priority = obligation.get("priority", "low")
            stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1
            
            # Count by party
            party = obligation.get("responsible_party", "unspecified")
            stats["by_party"][party] = stats["by_party"].get(party, 0) + 1
            
            # Count deadlines
            if obligation.get("deadline", {}).get("has_deadline"):
                stats["with_deadlines"] += 1
        
        # Calculate average confidence
        confidences = [o.get("confidence", 0.0) for o in obligations]
        stats["average_confidence"] = sum(confidences) / len(confidences) if confidences else 0.0
        
        return stats
    
    async def _store_obligations_in_memory(
        self,
        user_id: str,
        extraction_id: str,
        result: Dict[str, Any]
    ):
        """Store obligation extraction result in AgentCore Memory."""
        try:
            await self.memory_client.store_analysis(
                user_id=user_id,
                analysis_id=extraction_id,
                analysis_result=result
            )
            logger.info(f"Stored obligations in memory: {extraction_id}")
        except Exception as e:
            logger.error(f"Failed to store obligations in memory: {e}")


# AgentCore entrypoint
async def extract_obligations_entrypoint(
    contract_text: str,
    contract_type: str = None,
    user_id: str = None,
    session_id: str = None
) -> Dict[str, Any]:
    """
    AgentCore entrypoint for obligation extraction.
    
    Args:
        contract_text: Contract text to analyze
        contract_type: Type of contract (optional)
        user_id: User ID for tracking
        session_id: Session ID for context
        
    Returns:
        Extraction result with obligations
    """
    agent = ObligationExtractionAgent()
    return await agent.extract_obligations(
        contract_text,
        contract_type,
        user_id,
        session_id
    )


if __name__ == "__main__":
    # Test the agent locally
    import asyncio
    
    test_contract = """
    POWER PURCHASE AGREEMENT
    
    The Seller shall deliver electricity to the Buyer at the agreed price of $45/MWh.
    The Buyer shall make payments within 30 days of receiving an invoice.
    The Seller must maintain insurance coverage of at least $5 million.
    Either party may terminate this agreement with 90 days written notice.
    The Seller shall provide monthly generation reports by the 5th of each month.
    """
    
    async def test():
        result = await extract_obligations_entrypoint(
            contract_text=test_contract,
            contract_type="Power Purchase Agreement",
            user_id="test-user",
            session_id="test-session"
        )
        
        print("\n=== Obligation Extraction Result ===")
        print(f"Success: {result['success']}")
        print(f"Extraction ID: {result.get('extraction_id')}")
        print(f"Total Obligations: {result.get('statistics', {}).get('total_obligations')}")
        print(f"Execution Time: {result.get('execution_time')}s")
        print(f"\nObligations:")
        for i, obligation in enumerate(result.get('obligations', []), 1):
            print(f"\n{i}. {obligation.get('description')[:100]}...")
            print(f"   Type: {obligation.get('type')}")
            print(f"   Priority: {obligation.get('priority')}")
            print(f"   Responsible Party: {obligation.get('responsible_party')}")
            print(f"   Has Deadline: {obligation.get('deadline', {}).get('has_deadline')}")
            print(f"   Confidence: {obligation.get('confidence'):.2f}")
    
    asyncio.run(test())
