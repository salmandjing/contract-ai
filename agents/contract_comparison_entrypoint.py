"""
Contract Comparison Agent Entrypoint for AgentCore Runtime.

This module provides the AgentCore entrypoint for the Contract Comparison Agent,
which performs side-by-side comparison of two contracts and identifies key differences.
"""

import os
import sys
import json
import logging
import asyncio
from typing import Dict, Any
from datetime import datetime, timezone

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


class ContractComparisonAgent:
    """
    Contract Comparison Agent that compares two contracts side-by-side.
    
    This agent:
    - Analyzes both contracts in parallel
    - Identifies key differences in terms, risks, and compliance
    - Calculates favorability scores
    - Generates comparison summary
    """
    
    def __init__(self):
        """Initialize the Contract Comparison Agent."""
        self.agent_name = "contract-comparison-agent"
        
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
        
        # Initialize tool registry (optional)
        try:
            self.tool_registry = GatewayToolRegistry()
            logger.info("Initialized Gateway Tool Registry")
        except Exception as e:
            logger.warning(f"Gateway Tool Registry not available: {e}")
            self.tool_registry = None
        
        logger.info(f"Contract Comparison Agent initialized: {self.agent_name}")
    
    async def _invoke_lambda_tool(self, function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Invoke a Lambda function tool."""
        try:
            import json
            # Map function names to actual Lambda function names
            lambda_function_map = {
                "identify_contract_type": "identify-contract-type",
                "extract_contract_parties": "extract-contract-parties", 
                "extract_pricing_terms": "extract-pricing-terms",
                "extract_contract_duration": "extract-contract-duration",
                "assess_contract_risks": "assess-contract-risks"
            }
            
            lambda_function_name = lambda_function_map.get(function_name)
            if not lambda_function_name:
                logger.warning(f"Unknown function: {function_name}")
                return {"success": False, "error": f"Unknown function: {function_name}"}
            
            # Invoke Lambda function
            response = self.lambda_client.invoke(
                FunctionName=lambda_function_name,
                InvocationType='RequestResponse',
                Payload=json.dumps(payload)
            )
            
            # Parse response
            response_payload = json.loads(response['Payload'].read())
            
            if response['StatusCode'] == 200:
                # Check if response has API Gateway format (statusCode + body)
                if isinstance(response_payload, dict) and 'body' in response_payload:
                    # Parse the body field which contains the actual response
                    if isinstance(response_payload['body'], str):
                        return json.loads(response_payload['body'])
                    else:
                        return response_payload['body']
                else:
                    # Direct response format
                    return response_payload
            else:
                logger.error(f"Lambda invocation failed: {response_payload}")
                return {"success": False, "error": "Lambda invocation failed"}
                
        except Exception as e:
            logger.error(f"Error invoking Lambda function {function_name}: {e}")
            return {"success": False, "error": str(e)}
    
    @observability.trace_agent_execution("contract-comparison-agent")
    async def compare_contracts(
        self,
        contract_a_text: str,
        contract_b_text: str,
        jurisdiction: str = "US",
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Compare two contracts and identify key differences.
        
        Args:
            contract_a_text: First contract text
            contract_b_text: Second contract text
            jurisdiction: Jurisdiction for compliance analysis
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Comparison result with both analyses and differences
        """
        start_time = datetime.now(timezone.utc)
        comparison_id = f"comparison-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        logger.info(f"🔍 Starting contract comparison: {comparison_id}")
        
        # Record comparison request metric
        observability.record_custom_metric(
            "ContractComparisonRequests",
            1.0,
            unit="Count",
            dimensions={"Jurisdiction": jurisdiction}
        )
        
        try:
            # Analyze both contracts in parallel
            logger.info("Analyzing both contracts in parallel...")
            
            analysis_a_task = self._analyze_single_contract(
                contract_a_text,
                jurisdiction,
                "Contract A",
                user_id,
                session_id
            )
            
            analysis_b_task = self._analyze_single_contract(
                contract_b_text,
                jurisdiction,
                "Contract B",
                user_id,
                session_id
            )
            
            # Wait for both analyses to complete
            results = await asyncio.gather(
                analysis_a_task,
                analysis_b_task,
                return_exceptions=True
            )
            
            analysis_a = results[0]
            analysis_b = results[1]
            
            # Handle individual analysis failures
            if isinstance(analysis_a, Exception):
                logger.error(f"❌ Contract A analysis failed: {analysis_a}")
                analysis_a = {
                    "success": False,
                    "error": str(analysis_a),
                    "contract_type": "Unknown",
                    "executive_summary": f"Analysis failed: {str(analysis_a)}"
                }
            
            if isinstance(analysis_b, Exception):
                logger.error(f"❌ Contract B analysis failed: {analysis_b}")
                analysis_b = {
                    "success": False,
                    "error": str(analysis_b),
                    "contract_type": "Unknown",
                    "executive_summary": f"Analysis failed: {str(analysis_b)}"
                }
            
            # Identify differences
            logger.info("Identifying differences between contracts...")
            logger.info(f"Analysis A parties: {analysis_a.get('key_terms', {}).get('parties', [])}")
            logger.info(f"Analysis B parties: {analysis_b.get('key_terms', {}).get('parties', [])}")
            differences = self._identify_differences(analysis_a, analysis_b)
            
            # Calculate favorability scores
            logger.info("Calculating favorability scores...")
            favorability_a = self._calculate_favorability_score(analysis_a)
            favorability_b = self._calculate_favorability_score(analysis_b)
            
            favorability_scores = {
                "contract_a": favorability_a,
                "contract_b": favorability_b
            }
            
            # Generate comparison summary
            logger.info("Generating comparison summary...")
            summary = self._generate_comparison_summary(differences, favorability_scores)
            
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            # Build side-by-side comparison for frontend
            side_by_side = self._build_side_by_side_comparison(analysis_a, analysis_b)
            
            # Build deviation analysis
            deviation_analysis = self._build_deviation_analysis(differences, favorability_scores)
            
            # Build recommendations
            recommendations = self._build_recommendations(differences, favorability_scores)
            
            # Build result in format expected by frontend
            result = {
                "success": True,
                "comparison_id": comparison_id,
                "agent_trace_id": comparison_id,  # For observability
                "summary": summary,
                "key_differences": self._format_key_differences(differences),
                "side_by_side": side_by_side,
                "deviation_analysis": deviation_analysis,
                "recommendations": recommendations,
                "favorability_scores": favorability_scores,
                "execution_time": execution_time,
                "metadata": {
                    "user_id": user_id,
                    "session_id": session_id,
                    "jurisdiction": jurisdiction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_name": self.agent_name,
                    "contract_a_analysis": analysis_a,
                    "contract_b_analysis": analysis_b
                }
            }
            
            # Store in memory
            if self.memory_client and user_id:
                await self._store_comparison_in_memory(user_id, comparison_id, result)
            
            logger.info(f"✅ Comparison completed in {execution_time:.2f}s")
            
            # Record success metrics
            observability.record_custom_metric(
                "ComparisonSuccessRate",
                100.0,
                unit="Percent"
            )
            
            # Record favorability score difference
            score_diff = abs(favorability_scores.get("contract_a", 0) - favorability_scores.get("contract_b", 0))
            observability.record_custom_metric(
                "FavorabilityScoreDifference",
                score_diff,
                unit="None"
            )
            
            return result
            
        except Exception as e:
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error(f"❌ Comparison failed: {e}", exc_info=True)
            
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
                    "agent_name": self.agent_name
                }
            }
    
    async def _analyze_single_contract(
        self,
        contract_text: str,
        jurisdiction: str,
        contract_label: str,
        user_id: str = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """
        Analyze a single contract using Gateway tools.
        
        Args:
            contract_text: Contract text to analyze
            jurisdiction: Jurisdiction for compliance
            contract_label: Label for logging (e.g., "Contract A")
            user_id: User ID for tracking
            session_id: Session ID for context
            
        Returns:
            Analysis result dictionary
        """
        logger.info(f"🔍 Analyzing {contract_label}")
        
        try:
            # Always try Lambda tools first (they're deployed now!)
            analysis_result = await self._analyze_with_gateway_tools(
                contract_text,
                jurisdiction
            )
            
            logger.info(f"✅ {contract_label} analysis complete")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"❌ {contract_label} analysis failed: {e}")
            raise
    
    async def _analyze_with_gateway_tools(
        self,
        contract_text: str,
        jurisdiction: str
    ) -> Dict[str, Any]:
        """
        Analyze contract using deployed Lambda tools.
        
        Args:
            contract_text: Contract text
            jurisdiction: Jurisdiction
            
        Returns:
            Analysis result
        """
        logger.info("Invoking Lambda functions for contract analysis...")
        
        # Invoke Lambda tools in parallel
        tasks = [
            self._invoke_lambda_tool("identify_contract_type", {"contract_text": contract_text}),
            self._invoke_lambda_tool("extract_contract_parties", {"contract_text": contract_text}),
            self._invoke_lambda_tool("extract_pricing_terms", {"contract_text": contract_text}),
            self._invoke_lambda_tool("extract_contract_duration", {"contract_text": contract_text}),
            self._invoke_lambda_tool("assess_contract_risks", {"contract_text": contract_text, "jurisdiction": jurisdiction}),
        ]
        
        # Execute all tools in parallel
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Parse results with fallbacks
            contract_type = "Unknown"
            if len(results) > 0 and not isinstance(results[0], Exception) and results[0].get("success"):
                # Try both contract_type and contract_type_name
                contract_type = results[0].get("contract_type_name") or results[0].get("contract_type", "Unknown")
            
            parties = []
            if len(results) > 1 and not isinstance(results[1], Exception) and results[1].get("success"):
                parties_data = results[1].get("parties", [])
                logger.info(f"Parties data from Lambda: {parties_data}")
                # Handle both simple list and complex dict format
                if parties_data and len(parties_data) > 0 and isinstance(parties_data[0], dict):
                    parties = [p.get("name", str(p)) for p in parties_data]
                else:
                    parties = parties_data
                logger.info(f"Parsed parties: {parties}")
            
            pricing = {}
            if len(results) > 2 and not isinstance(results[2], Exception) and results[2].get("success"):
                pricing = results[2].get("pricing_terms", {})
            
            duration = {}
            if len(results) > 3 and not isinstance(results[3], Exception) and results[3].get("success"):
                duration = results[3].get("duration", {})
            
            risks = []
            if len(results) > 4 and not isinstance(results[4], Exception) and results[4].get("success"):
                logger.info(f"Risk data from Lambda: {results[4]}")
                # Try different risk fields from Bedrock response
                risks = (results[4].get("risks", []) or 
                        results[4].get("critical_risks", []) or
                        results[4].get("financial_risks", {}).get("risk_factors", []) or
                        [])
                logger.info(f"Parsed risks: {risks}")
            
            logger.info(f"Lambda analysis complete: type={contract_type}, parties={len(parties)}, risks={len(risks)}")
            logger.info(f"About to return parties: {parties}")
            logger.info(f"About to return risks: {risks}")
            
            # Build structured result
            result = {
                "success": True,
                "contract_type": contract_type,
                "executive_summary": self._build_summary(contract_type, parties, pricing, duration, risks),
                "key_terms": {
                    "parties": parties,
                    "pricing": pricing,
                    "duration": duration
                },
                "risk_assessment": {
                    "risks": risks,
                    "risk_count": len(risks)
                },
                "metadata": {
                    "contract_length": len(contract_text),
                    "word_count": len(contract_text.split())
                }
            }
            logger.info(f"Returning analysis with {len(parties)} parties and {len(risks)} risks")
            return result
        except Exception as e:
            logger.error(f"Lambda analysis failed: {e}, falling back to basic analysis")
            import traceback
            traceback.print_exc()
            return self._basic_analysis(contract_text, jurisdiction)
    
    def _basic_analysis(self, contract_text: str, jurisdiction: str) -> Dict[str, Any]:
        """
        Perform basic analysis without Gateway tools.
        
        Args:
            contract_text: Contract text
            jurisdiction: Jurisdiction
            
        Returns:
            Basic analysis result
        """
        # Simple heuristic-based analysis
        contract_type = "Unknown"
        if "power purchase" in contract_text.lower():
            contract_type = "Power Purchase Agreement"
        elif "service" in contract_text.lower() and "agreement" in contract_text.lower():
            contract_type = "Service Agreement"
        
        return {
            "success": True,
            "contract_type": contract_type,
            "executive_summary": f"Contract analysis for {contract_type}. Length: {len(contract_text)} characters.",
            "key_terms": {
                "contract_length": len(contract_text),
                "jurisdiction": jurisdiction,
                "word_count": len(contract_text.split())
            },
            "metadata": {
                "contract_length": len(contract_text),
                "word_count": len(contract_text.split())
            }
        }
    
    def _build_summary(
        self,
        contract_type: str,
        parties: list,
        pricing,  # Can be dict or any type
        duration,  # Can be dict or any type
        risks: list
    ) -> str:
        """Build executive summary from extracted data."""
        logger.info(f"Building summary with parties={parties}, risks={len(risks)}")
        
        # Handle pricing - can be dict, string, or other
        if isinstance(pricing, dict):
            pricing_str = pricing.get('summary', 'Not specified')
        elif pricing:
            pricing_str = str(pricing)
        else:
            pricing_str = 'Not specified'
        
        # Handle duration - can be dict, string, or other
        if isinstance(duration, dict):
            duration_str = duration.get('summary', 'Not specified')
        elif duration:
            duration_str = str(duration)
        else:
            duration_str = 'Not specified'
        
        summary_parts = [
            f"Contract Type: {contract_type}",
            f"Parties: {', '.join(parties) if parties else 'Not specified'}",
            f"Pricing: {pricing_str}",
            f"Duration: {duration_str}",
            f"Risk Count: {len(risks)}"
        ]
        return "\n".join(summary_parts)
    
    def _identify_differences(
        self,
        analysis_a: Dict[str, Any],
        analysis_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Identify key differences between two analyses.
        
        Returns:
            Dictionary of differences
        """
        differences = {}
        
        # Compare contract types
        type_a = analysis_a.get("contract_type", "Unknown")
        type_b = analysis_b.get("contract_type", "Unknown")
        
        differences["contract_type_diff"] = {
            "contract_a": type_a,
            "contract_b": type_b,
            "difference": "Different contract types" if type_a != type_b else "Same contract type",
            "significance": "high" if type_a != type_b else "low"
        }
        
        # Compare parties
        parties_a = analysis_a.get("key_terms", {}).get("parties", [])
        parties_b = analysis_b.get("key_terms", {}).get("parties", [])
        logger.info(f"Comparing parties - A: {parties_a}, B: {parties_b}")
        
        differences["parties_diff"] = {
            "contract_a": parties_a,
            "contract_b": parties_b,
            "difference": "Different parties" if parties_a != parties_b else "Same parties",
            "significance": "medium" if parties_a != parties_b else "low"
        }
        
        # Compare risks
        risks_a = analysis_a.get("risk_assessment", {}).get("risks", [])
        risks_b = analysis_b.get("risk_assessment", {}).get("risks", [])
        
        unique_risks_a = [r for r in risks_a if r not in risks_b]
        unique_risks_b = [r for r in risks_b if r not in risks_a]
        
        differences["risk_diff"] = {
            "contract_a_risks": risks_a,
            "contract_b_risks": risks_b,
            "unique_to_a": unique_risks_a,
            "unique_to_b": unique_risks_b,
            "difference": f"{len(unique_risks_a)} unique risks in A, {len(unique_risks_b)} unique risks in B",
            "significance": "high" if unique_risks_a or unique_risks_b else "low"
        }
        
        return differences
    
    def _calculate_favorability_score(self, analysis: Dict[str, Any]) -> float:
        """
        Calculate favorability score (0-100).
        
        Higher score = more favorable contract
        
        Args:
            analysis: Analysis result
            
        Returns:
            Favorability score
        """
        if not analysis.get("success", False):
            return 0.0
        
        score = 100.0
        
        # Penalize based on risk count
        risks = analysis.get("risk_assessment", {}).get("risks", [])
        risk_penalty = len(risks) * 5.0  # 5 points per risk
        score -= min(risk_penalty, 50.0)  # Max 50 point penalty
        
        # Ensure score is within bounds
        return max(0.0, min(100.0, round(score, 2)))
    
    def _generate_comparison_summary(
        self,
        differences: Dict[str, Any],
        favorability_scores: Dict[str, float]
    ) -> str:
        """
        Generate markdown summary of comparison.
        
        Args:
            differences: Dictionary of differences
            favorability_scores: Favorability scores
            
        Returns:
            Markdown-formatted summary
        """
        summary_parts = []
        
        summary_parts.append("# Contract Comparison Summary\n")
        
        # Favorability scores
        summary_parts.append("## Overall Favorability Assessment\n")
        score_a = favorability_scores.get("contract_a", 0)
        score_b = favorability_scores.get("contract_b", 0)
        
        summary_parts.append(f"- **Contract A Favorability Score**: {score_a}/100")
        summary_parts.append(f"- **Contract B Favorability Score**: {score_b}/100\n")
        
        if score_a > score_b:
            summary_parts.append(f"✅ **Contract A is more favorable** by {score_a - score_b:.1f} points\n")
        elif score_b > score_a:
            summary_parts.append(f"✅ **Contract B is more favorable** by {score_b - score_a:.1f} points\n")
        else:
            summary_parts.append("⚖️ **Both contracts are equally favorable**\n")
        
        # Contract type
        summary_parts.append("## Contract Type\n")
        contract_type_diff = differences.get("contract_type_diff", {})
        summary_parts.append(f"- Contract A: {contract_type_diff.get('contract_a', 'Unknown')}")
        summary_parts.append(f"- Contract B: {contract_type_diff.get('contract_b', 'Unknown')}\n")
        
        # Parties
        summary_parts.append("## Parties\n")
        parties_diff = differences.get("parties_diff", {})
        parties_a = parties_diff.get('contract_a', [])
        parties_b = parties_diff.get('contract_b', [])
        logger.info(f"Summary parties A: {parties_a}, B: {parties_b}")
        summary_parts.append(f"- Contract A: {', '.join(parties_a) if parties_a else 'Not specified'}")
        summary_parts.append(f"- Contract B: {', '.join(parties_b) if parties_b else 'Not specified'}\n")
        
        # Risks
        summary_parts.append("## Risk Assessment\n")
        risk_diff = differences.get("risk_diff", {})
        summary_parts.append(f"- Contract A: {len(risk_diff.get('contract_a_risks', []))} risks identified")
        summary_parts.append(f"- Contract B: {len(risk_diff.get('contract_b_risks', []))} risks identified\n")
        
        return "\n".join(summary_parts)
    
    def _format_key_differences(self, differences: Dict[str, Any]) -> list:
        """Format differences as a list of strings for frontend display."""
        formatted = []
        
        # Contract type difference
        contract_type_diff = differences.get("contract_type_diff", {})
        if contract_type_diff.get("significance") != "low":
            formatted.append(f"**Contract Type**: {contract_type_diff.get('difference')}")
        
        # Parties difference
        parties_diff = differences.get("parties_diff", {})
        if parties_diff.get("significance") != "low":
            formatted.append(f"**Parties**: {parties_diff.get('difference')}")
        
        # Risk difference
        risk_diff = differences.get("risk_diff", {})
        if risk_diff.get("significance") != "low":
            formatted.append(f"**Risks**: {risk_diff.get('difference')}")
        
        return formatted if formatted else ["No significant differences found"]
    
    def _build_side_by_side_comparison(
        self,
        analysis_a: Dict[str, Any],
        analysis_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build side-by-side comparison for frontend."""
        parties_a = analysis_a.get("key_terms", {}).get("parties", [])
        parties_b = analysis_b.get("key_terms", {}).get("parties", [])
        risks_a = analysis_a.get("risk_assessment", {}).get("risks", [])
        risks_b = analysis_b.get("risk_assessment", {}).get("risks", [])
        
        return {
            "Contract Type": {
                "contract1": analysis_a.get("contract_type", "Unknown"),
                "contract2": analysis_b.get("contract_type", "Unknown")
            },
            "Parties": {
                "contract1": ", ".join(parties_a) if parties_a else "Not specified",
                "contract2": ", ".join(parties_b) if parties_b else "Not specified"
            },
            "Parties Detail": {
                "contract1": parties_a,
                "contract2": parties_b
            },
            "Risk Count": {
                "contract1": str(len(risks_a)),
                "contract2": str(len(risks_b))
            },
            "Risks Detail": {
                "contract1": risks_a,
                "contract2": risks_b
            },
            "Word Count": {
                "contract1": str(analysis_a.get("metadata", {}).get("word_count", 0)),
                "contract2": str(analysis_b.get("metadata", {}).get("word_count", 0))
            }
        }
    
    def _build_deviation_analysis(
        self,
        differences: Dict[str, Any],
        favorability_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Build deviation analysis for frontend."""
        score_a = favorability_scores.get("contract_a", 0)
        score_b = favorability_scores.get("contract_b", 0)
        score_diff = abs(score_a - score_b)
        
        deviations = []
        detailed_analysis = {}
        
        # Add significant differences
        for key, diff in differences.items():
            if diff.get("significance") in ["high", "medium"]:
                deviations.append(f"{key.replace('_', ' ').title()}: {diff.get('difference')}")
                detailed_analysis[key] = diff
        
        return {
            "overall_deviation_score": round(score_diff, 2),
            "deviations": deviations,
            "detailed_differences": detailed_analysis,
            "favorability_difference": round(score_diff, 2),
            "more_favorable": "contract_a" if score_a > score_b else "contract_b" if score_b > score_a else "equal"
        }
    
    def _build_recommendations(
        self,
        differences: Dict[str, Any],
        favorability_scores: Dict[str, float]
    ) -> list:
        """Build recommendations based on comparison."""
        recommendations = []
        
        score_a = favorability_scores.get("contract_a", 0)
        score_b = favorability_scores.get("contract_b", 0)
        
        # Favorability recommendation
        if score_a > score_b + 10:
            recommendations.append("Consider using Contract A as it has a significantly higher favorability score")
        elif score_b > score_a + 10:
            recommendations.append("Consider using Contract B as it has a significantly higher favorability score")
        else:
            recommendations.append("Both contracts have similar favorability scores - review specific terms carefully")
        
        # Risk-based recommendations
        risk_diff = differences.get("risk_diff", {})
        unique_risks_a = risk_diff.get("unique_to_a", [])
        unique_risks_b = risk_diff.get("unique_to_b", [])
        
        if unique_risks_a:
            recommendations.append(f"Contract A has {len(unique_risks_a)} unique risk(s) that should be reviewed")
        if unique_risks_b:
            recommendations.append(f"Contract B has {len(unique_risks_b)} unique risk(s) that should be reviewed")
        
        # Contract type recommendation
        contract_type_diff = differences.get("contract_type_diff", {})
        if contract_type_diff.get("significance") == "high":
            recommendations.append("Contracts are of different types - ensure this is intentional")
        
        return recommendations if recommendations else ["No specific recommendations at this time"]
    
    async def _store_comparison_in_memory(
        self,
        user_id: str,
        comparison_id: str,
        result: Dict[str, Any]
    ):
        """Store comparison result in AgentCore Memory."""
        try:
            # Use the correct memory client method
            self.memory_client.store_session_data(
                session_id=comparison_id,
                user_id=user_id or "demo-user",
                data=result
            )
            logger.info(f"Stored comparison in memory: {comparison_id}")
        except Exception as e:
            logger.error(f"Failed to store comparison in memory: {e}")


# AgentCore entrypoint
async def compare_contracts_entrypoint(
    contract_a_text: str,
    contract_b_text: str,
    jurisdiction: str = "US",
    user_id: str = None,
    session_id: str = None
) -> Dict[str, Any]:
    """
    AgentCore entrypoint for contract comparison.
    
    Args:
        contract_a_text: First contract text
        contract_b_text: Second contract text
        jurisdiction: Jurisdiction for compliance
        user_id: User ID for tracking
        session_id: Session ID for context
        
    Returns:
        Comparison result
    """
    agent = ContractComparisonAgent()
    return await agent.compare_contracts(
        contract_a_text,
        contract_b_text,
        jurisdiction,
        user_id,
        session_id
    )


if __name__ == "__main__":
    # Test the agent locally
    import asyncio
    
    test_contract_a = """
    POWER PURCHASE AGREEMENT
    
    This agreement is between ABC Solar LLC and XYZ Utility Company.
    Price: $45/MWh for 20 years.
    Capacity: 100 MW solar facility.
    """
    
    test_contract_b = """
    POWER PURCHASE AGREEMENT
    
    This agreement is between DEF Wind LLC and XYZ Utility Company.
    Price: $50/MWh for 15 years.
    Capacity: 150 MW wind facility.
    """
    
    async def test():
        result = await compare_contracts_entrypoint(
            contract_a_text=test_contract_a,
            contract_b_text=test_contract_b,
            jurisdiction="US",
            user_id="test-user",
            session_id="test-session"
        )
        
        print("\n=== Comparison Result ===")
        print(f"Success: {result['success']}")
        print(f"Comparison ID: {result.get('comparison_id')}")
        print(f"Execution Time: {result.get('execution_time')}s")
        print(f"\nFavorability Scores:")
        print(f"  Contract A: {result.get('favorability_scores', {}).get('contract_a')}")
        print(f"  Contract B: {result.get('favorability_scores', {}).get('contract_b')}")
        print(f"\nSummary:\n{result.get('summary')}")
    
    asyncio.run(test())
