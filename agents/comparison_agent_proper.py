"""
Contract Comparison Agent - Proper AgentCore Runtime Implementation

This uses the proper AgentCore Runtime pattern with Strands Agents,
following the examples from amazon-bedrock-agentcore-samples.
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the AgentCore app
app = BedrockAgentCoreApp()

# Create the Strands Agent
# Use inference profile for Claude Sonnet 4
agent = Agent(
    model="us.anthropic.claude-sonnet-4-20250514-v1:0",
    system_prompt="""You are an expert contract comparison analyst. 

When given two contracts, you analyze and compare them across multiple dimensions:

1. **Contract Parties**: Identify all parties in each contract
2. **Contract Type**: Determine the type of each agreement
3. **Key Terms**: Compare pricing, duration, payment terms, and obligations
4. **Risks**: Identify and compare risks in each contract
5. **Favorability**: Assess which contract is more favorable and why

Provide your analysis in a structured format with:
- Clear identification of parties from each contract
- Detailed risk assessment for each contract
- Favorability scores (0-100) with justification
- Specific recommendations

Be thorough, precise, and highlight key differences that matter."""
)


@app.entrypoint
def invoke(payload, context=None):
    """
    AgentCore Runtime entrypoint for contract comparison.
    
    Args:
        payload: Dictionary containing:
            - contract_a_text: First contract text
            - contract_b_text: Second contract text
            - jurisdiction: Optional jurisdiction (default: US)
        context: AgentCore context (optional)
    
    Returns:
        Structured comparison result
    """
    logger.info("🔍 Contract Comparison Agent invoked via AgentCore Runtime")
    
    # Extract contracts from payload
    contract_a = payload.get('contract_a_text', payload.get('contract1', ''))
    contract_b = payload.get('contract_b_text', payload.get('contract2', ''))
    jurisdiction = payload.get('jurisdiction', 'US')
    
    if not contract_a or not contract_b:
        return {
            "success": False,
            "error": "Both contract_a_text and contract_b_text are required"
        }
    
    # Build the comparison prompt
    comparison_prompt = f"""Compare these two contracts in detail:

CONTRACT A:
{contract_a}

---

CONTRACT B:
{contract_b}

---

Jurisdiction: {jurisdiction}

Please provide a comprehensive comparison including:

1. **Parties**: List all parties from each contract
2. **Contract Types**: Identify the type of each agreement
3. **Key Terms**: Compare pricing, duration, and major obligations
4. **Risks**: Identify specific risks in each contract
5. **Favorability Analysis**: 
   - Assign a favorability score (0-100) to each contract
   - Explain which contract is more favorable and why
6. **Recommendations**: Provide actionable recommendations

Format your response clearly with sections for each comparison dimension."""
    
    logger.info(f"Invoking Strands Agent for comparison (A: {len(contract_a)} chars, B: {len(contract_b)} chars)")
    
    # Invoke the Strands Agent
    result = agent(comparison_prompt)
    
    # Parse the agent's response into structured format
    # Handle different response types
    logger.info(f"Result type: {type(result.message)}")
    
    if isinstance(result.message, dict):
        logger.info(f"Dict keys: {result.message.keys()}")
        # Try to extract text from common keys
        if 'text' in result.message:
            response_text = result.message['text']
        elif 'content' in result.message:
            content = result.message['content']
            if isinstance(content, list):
                # Extract text from content blocks
                text_parts = []
                for block in content:
                    if isinstance(block, dict) and 'text' in block:
                        text_parts.append(block['text'])
                response_text = '\n'.join(text_parts)
            else:
                response_text = str(content)
        else:
            response_text = str(result.message)
    elif isinstance(result.message, list):
        # Handle list of message parts - extract text content
        text_parts = []
        for part in result.message:
            if isinstance(part, dict) and 'text' in part:
                text_parts.append(part['text'])
            elif isinstance(part, str):
                text_parts.append(part)
            else:
                text_parts.append(str(part))
        response_text = '\n'.join(text_parts)
    else:
        response_text = str(result.message)
    
    parsed_result = parse_comparison_response(response_text)
    
    logger.info(f"✅ Comparison complete: {len(parsed_result.get('side_by_side', {}))} sections")
    
    return {
        "success": True,
        "summary": response_text,
        "side_by_side": parsed_result.get('side_by_side', {}),
        "favorability_scores": parsed_result.get('favorability_scores', {}),
        "key_differences": parsed_result.get('key_differences', []),
        "recommendations": parsed_result.get('recommendations', []),
        "method": "AgentCore Runtime + Strands Agent"
    }


def parse_comparison_response(response_text: str) -> dict:
    """
    Parse the agent's response into structured format.
    
    Args:
        response_text: Raw text response from the agent
        
    Returns:
        Structured comparison data
    """
    result = {
        'side_by_side': {},
        'favorability_scores': {'contract_a': 75, 'contract_b': 75},
        'key_differences': [],
        'recommendations': []
    }
    
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
        
        lower_line = line.lower()
        
        # Detect sections
        if 'contract a' in lower_line and 'parties' in lower_line:
            current_section = 'parties_a'
        elif 'contract b' in lower_line and 'parties' in lower_line:
            current_section = 'parties_b'
        elif 'contract a' in lower_line and 'risk' in lower_line:
            current_section = 'risks_a'
        elif 'contract b' in lower_line and 'risk' in lower_line:
            current_section = 'risks_b'
        elif 'recommendation' in lower_line:
            current_section = 'recommendations'
        # Extract favorability scores
        elif 'favorability' in lower_line or 'score' in lower_line:
            if 'contract a' in lower_line:
                score = extract_score(line)
                if score:
                    result['favorability_scores']['contract_a'] = score
            elif 'contract b' in lower_line:
                score = extract_score(line)
                if score:
                    result['favorability_scores']['contract_b'] = score
        # Parse list items
        elif line.startswith(('- ', '• ', '* ', '1.', '2.', '3.', '4.', '5.')):
            item = line.lstrip('-•*123456789. ').strip()
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
    
    # Add default recommendations if none found
    if not result['recommendations']:
        result['recommendations'] = [
            "Review the detailed comparison above",
            "Consider legal consultation for complex terms",
            "Verify all parties and obligations"
        ]
    
    return result


def extract_score(text: str) -> int:
    """Extract numeric score from text."""
    import re
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


# For local testing
def test_local():
    """Test the agent locally before deploying."""
    test_payload = {
        "contract_a_text": """
POWER PURCHASE AGREEMENT
Parties: Solar Genesis LLC and Riverside Municipal Power Authority
Term: 20 years
Price: $45/MWh escalating at 2% annually
Risks: Force majeure, construction risk, market price risk
        """,
        "contract_b_text": """
SOLAR ENERGY PURCHASE AGREEMENT
Parties: QuickSolar Development Corp and Valley Municipal Utility
Term: 15 years
Price: $50/MWh fixed
Risks: Weather-dependent generation, technology risk, regulatory risk, no price adjustment
        """,
        "jurisdiction": "US"
    }
    
    result = invoke(test_payload)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    # Run the AgentCore Runtime
    app.run()
