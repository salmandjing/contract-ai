"""
Contract Comparison Agent - AgentCore Version

This is the proper AgentCore implementation that uses Bedrock Agents
for orchestration instead of manual Lambda calls.
"""

import os
import sys
import json
import logging
import boto3
from typing import Dict, Any
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.memory_client import MemoryClient
from config.observability import ObservabilityInstrumentation, observability

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Bedrock Agent configuration
BEDROCK_AGENT_ID = os.getenv('BEDROCK_AGENT_ID', 'OTNEP8O85O')
BEDROCK_ALIAS_ID = os.getenv('BEDROCK_ALIAS_ID', '0QTJXKNUWW')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')


class ContractComparisonAgentCore:
    """
    Contract Comparison Agent using AWS Bedrock AgentCore.
    
    This agent uses Bedrock's native agent orchestration instead of
    manual Lambda calls, providing better tool management and conversation flow.
    """
    
    def __init__(self):
        """Initialize the AgentCore-based comparison agent."""
        self.agent_name = "contract-comparison-agentcore"
        
        # Initialize Bedrock Agent Runtime client
        from botocore.config import Config
        config = Config(
            read_timeout=120,
            connect_timeout=10,
            retries={'max_attempts': 2}
        )
        self.bedrock_client = boto3.client(
            'bedrock-agent-runtime',
            region_name=AWS_REGION,
            config=config
        )
        logger.info(f"Initialized Bedrock Agent Runtime client (Agent: {BEDROCK_AGENT_ID})")
        
        # Initialize Memory Client
        self.memory_client = MemoryClient()
        logger.info("Initialized Memory Client")
        
        # Initialize Observability
        self.observability = ObservabilityInstrumentation(
            service_name=self.agent_name
        )
        logger.info("Initialized Observability Instrumentation")
        
        self.session_counter = 0
        logger.info(f"Contract Comparison AgentCore initialized: {self.agent_name}")
    
    @observability.trace_agent_execution("contract-comparison-agentcore")
    async def compare_contracts(
        self,
        contract_a_text: str,
        contract_b_text: str,
        jurisdiction: str = "US",
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Compare two contracts using Bedrock Agent orchestration.
        
        Args:
            contract_a_text: First contract text
            contract_b_text: Second contract text
            jurisdiction: Jurisdiction for compliance analysis
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Comparison result with structured analysis
        """
        start_time = datetime.now(timezone.utc)
        comparison_id = f"comparison-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"🔍 Starting AgentCore comparison: {comparison_id}")
        
        # Record metric
        observability.record_custom_metric(
            "ContractComparisonRequests",
            1.0,
            unit="Count",
            dimensions={"Jurisdiction": jurisdiction, "Method": "AgentCore"}
        )
        
        try:
            # Generate unique session ID for Bedrock
            self.session_counter += 1
            bedrock_session_id = f"compare-{self.session_counter}-{int(start_time.timestamp())}"
            
            # Craft the comparison prompt for Bedrock Agent
            comparison_prompt = self._build_comparison_prompt(
                contract_a_text,
                contract_b_text,
                jurisdiction
            )
            
            logger.info(f"Invoking Bedrock Agent for comparison (session: {bedrock_session_id})")
            
            # Invoke Bedrock Agent
            response = self.bedrock_client.invoke_agent(
                agentId=BEDROCK_AGENT_ID,
                agentAliasId=BEDROCK_ALIAS_ID,
                sessionId=bedrock_session_id,
                inputText=comparison_prompt
            )
            
            # Process streaming response
            result_text = ""
            event_stream = response['completion']
            
            for event in event_stream:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        result_text += chunk['bytes'].decode('utf-8')
            
            logger.info(f"Received Bedrock response ({len(result_text)} chars)")
            
            # Parse the Bedrock response into structured format
            parsed_result = self._parse_comparison_response(result_text)
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build final result
            result = {
                "success": True,
                "comparison_id": comparison_id,
                "agent_trace_id": bedrock_session_id,
                "summary": parsed_result.get('summary', result_text),
                "key_differences": parsed_result.get('key_differences', []),
                "side_by_side": parsed_result.get('side_by_side', {}),
                "deviation_analysis": parsed_result.get('deviation_analysis', {}),
                "recommendations": parsed_result.get('recommendations', []),
                "favorability_scores": parsed_result.get('favorability_scores', {
                    "contract_a": 75,
                    "contract_b": 75
                }),
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "jurisdiction": jurisdiction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "bedrock_session_id": bedrock_session_id,
                    "method": "AgentCore"
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_comparison_in_memory(user_id, comparison_id, result)
            
            logger.info(f"✅ AgentCore comparison completed in {execution_time:.2f}s")
            
            # Record success metrics
            observability.record_custom_metric(
                "ComparisonSuccessRate",
                100.0,
                unit="Percent"
            )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ AgentCore comparison failed: {e}", exc_info=True)
            
            return {
                "success": False,
                "comparison_id": comparison_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "jurisdiction": jurisdiction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "method": "AgentCore"
                }
            }
    
    def _build_comparison_prompt(
        self,
        contract_a_text: str,
        contract_b_text: str,
        jurisdiction: str
    ) -> str:
        """Build the comparison prompt for Bedrock Agent."""
        prompt = f"""Compare these two contracts and provide a detailed analysis:

CONTRACT A:
{contract_a_text}

---

CONTRACT B:
{contract_b_text}

---

Please analyze and compare:
1. Contract parties - who are the parties in each contract?
2. Contract types - what type of agreement is each?
3. Key terms - pricing, duration, obligations
4. Risks - identify and compare risks in each contract
5. Favorability - which contract is more favorable and why?

Jurisdiction: {jurisdiction}

Provide a structured comparison with:
- Summary of key differences
- Side-by-side comparison of parties and risks
- Favorability scores (0-100) for each contract
- Recommendations
"""
        return prompt
    
    def _parse_comparison_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Bedrock Agent response into structured comparison format.
        
        Args:
            response_text: Raw text response from Bedrock
            
        Returns:
            Structured comparison data
        """
        logger.info("Parsing Bedrock comparison response")
        
        # Initialize result structure
        result = {
            'summary': response_text,
            'key_differences': [],
            'side_by_side': {},
            'deviation_analysis': {},
            'recommendations': [],
            'favorability_scores': {
                'contract_a': 75,
                'contract_b': 75
            }
        }
        
        # Parse the response text
        lines = response_text.split('\n')
        current_section = None
        parties_a = []
        parties_b = []
        risks_a = []
        risks_b = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect sections
            lower_line = line.lower()
            
            # Extract parties
            if 'contract a' in lower_line and 'parties' in lower_line:
                current_section = 'parties_a'
            elif 'contract b' in lower_line and 'parties' in lower_line:
                current_section = 'parties_b'
            # Extract risks
            elif 'contract a' in lower_line and 'risk' in lower_line:
                current_section = 'risks_a'
            elif 'contract b' in lower_line and 'risk' in lower_line:
                current_section = 'risks_b'
            # Extract recommendations
            elif 'recommendation' in lower_line:
                current_section = 'recommendations'
            # Extract favorability scores
            elif 'favorability' in lower_line or 'score' in lower_line:
                # Try to extract scores
                if 'contract a' in lower_line:
                    score = self._extract_score(line)
                    if score:
                        result['favorability_scores']['contract_a'] = score
                elif 'contract b' in lower_line:
                    score = self._extract_score(line)
                    if score:
                        result['favorability_scores']['contract_b'] = score
            # Parse list items
            elif line.startswith('- ') or line.startswith('• ') or line.startswith('* '):
                item = line[2:].strip()
                if current_section == 'parties_a':
                    parties_a.append(item)
                elif current_section == 'parties_b':
                    parties_b.append(item)
                elif current_section == 'risks_a':
                    risks_a.append(item)
                elif current_section == 'risks_b':
                    risks_b.append(item)
                elif current_section == 'recommendations':
                    result['recommendations'].append(item)
            elif line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                # Numbered list
                item = line.split('.', 1)[1].strip()
                if current_section == 'recommendations':
                    result['recommendations'].append(item)
        
        # Build side-by-side comparison
        result['side_by_side'] = {
            'Parties Detail': {
                'contract1': parties_a if parties_a else ['Not specified'],
                'contract2': parties_b if parties_b else ['Not specified']
            },
            'Risks Detail': {
                'contract1': risks_a if risks_a else ['No risks identified'],
                'contract2': risks_b if risks_b else ['No risks identified']
            }
        }
        
        # Build key differences
        if parties_a != parties_b:
            result['key_differences'].append(f"Different parties: A has {len(parties_a)}, B has {len(parties_b)}")
        if len(risks_a) != len(risks_b):
            result['key_differences'].append(f"Different risk levels: A has {len(risks_a)} risks, B has {len(risks_b)} risks")
        
        # Build deviation analysis
        score_diff = abs(result['favorability_scores']['contract_a'] - result['favorability_scores']['contract_b'])
        result['deviation_analysis'] = {
            'overall_deviation_score': score_diff,
            'deviations': result['key_differences'],
            'favorability_difference': score_diff,
            'more_favorable': 'contract_a' if result['favorability_scores']['contract_a'] > result['favorability_scores']['contract_b'] else 'contract_b'
        }
        
        # Add default recommendations if none found
        if not result['recommendations']:
            result['recommendations'] = [
                "Review the detailed comparison above",
                "Consider legal consultation for complex terms",
                "Verify all parties and obligations"
            ]
        
        logger.info(f"Parsed: {len(parties_a)} parties A, {len(parties_b)} parties B, {len(risks_a)} risks A, {len(risks_b)} risks B")
        
        return result
    
    def _extract_score(self, text: str) -> int:
        """Extract numeric score from text."""
        import re
        # Look for patterns like "85/100", "85", "score: 85"
        patterns = [
            r'(\d+)/100',
            r'score[:\s]+(\d+)',
            r'(\d+)\s*points',
            r':\s*(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                score = int(match.group(1))
                if 0 <= score <= 100:
                    return score
        return None
    
    async def _store_comparison_in_memory(
        self,
        user_id: str,
        comparison_id: str,
        result: Dict[str, Any]
    ):
        """Store comparison result in memory."""
        try:
            memory_data = {
                'comparison_id': comparison_id,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'favorability_scores': result.get('favorability_scores', {}),
                'key_differences': result.get('key_differences', [])
            }
            
            await self.memory_client.store_memory(
                user_id=user_id,
                memory_type='comparison',
                memory_data=memory_data
            )
            logger.info(f"Stored comparison in memory: {comparison_id}")
        except Exception as e:
            logger.warning(f"Failed to store comparison in memory: {e}")


# Lambda handler for AWS deployment
def lambda_handler(event, context):
    """AWS Lambda handler for comparison agent."""
    import asyncio
    
    # Extract parameters
    body = json.loads(event.get('body', '{}'))
    contract_a = body.get('contract_a_text', '')
    contract_b = body.get('contract_b_text', '')
    jurisdiction = body.get('jurisdiction', 'US')
    user_id = body.get('user_id')
    session_id = body.get('session_id')
    
    # Create agent and run comparison
    agent = ContractComparisonAgentCore()
    
    # Run async function
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        agent.compare_contracts(
            contract_a,
            contract_b,
            jurisdiction,
            user_id,
            session_id
        )
    )
    
    return {
        'statusCode': 200 if result.get('success') else 500,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result)
    }
