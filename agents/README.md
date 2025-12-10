# AgentCore Agents

This directory contains the AgentCore Runtime agents and wrapper implementations for the Contract AI Platform migration.

## Overview

The agents in this directory provide the integration layer between the existing Strands-based contract analysis agents and AWS Bedrock AgentCore Runtime. The implementation includes:

1. **AgentCore Wrapper** - Adapts Strands agents to AgentCore format
2. **Contract Analysis Entrypoint** - Main entrypoint for contract analysis
3. **Hello World Agent** - Example agent for testing AgentCore setup

## Files

### Core Implementation

- **`agentcore_wrapper.py`** - Wrapper class that adapts Strands agents to AgentCore

  - Request/response format conversion
  - Error handling and retry logic
  - Timeout management
  - Async execution support

- **`contract_analysis_entrypoint.py`** - AgentCore Runtime entrypoint for contract analysis

  - `@app.entrypoint` decorated functions
  - Main `analyze_contract` function
  - Quick analysis and health check endpoints
  - Agent configuration and deployment

- **`hello_world_agent.py`** - Simple test agent for verifying AgentCore setup

### Supporting Files

- **`__init__.py`** - Package initialization

## Usage

### Basic Contract Analysis

```python
from agents.contract_analysis_entrypoint import analyze_contract

# Analyze a contract
result = await analyze_contract(
    contract_text="POWER PURCHASE AGREEMENT...",
    jurisdiction="US",
    user_id="user-123",
    session_id="session-456"
)

if result['success']:
    print(f"Contract Type: {result['contract_type']}")
    print(f"Summary: {result['executive_summary']}")
```

### Using the Wrapper Directly

```python
from agents.agentcore_wrapper import create_wrapper
from contracts_ai_demo.contract_ai_platform.agents.contract_analysis_agent import ContractAnalysisAgent

# Create Strands agent
strands_agent = ContractAnalysisAgent()

# Wrap it for AgentCore
wrapper = create_wrapper(
    strands_agent=strands_agent,
    agent_name="contract-analysis",
    max_retries=3,
    timeout_seconds=300
)

# Execute with retry logic
result = await wrapper.execute_with_retry({
    'contract_text': 'Sample contract...',
    'jurisdiction': 'US',
    'user_id': 'user-123',
    'session_id': 'session-456'
})
```

### Deploy Agent to AgentCore Runtime

```python
from agents.contract_analysis_entrypoint import deploy_agent, configure_agent

# Configure agent settings
configure_agent(
    memory_mb=4096,
    timeout_seconds=600,
    environment="production"
)

# Deploy to AgentCore Runtime
deployment_info = deploy_agent()
print(f"Agent ARN: {deployment_info['agent_arn']}")
print(f"Status: {deployment_info['status']}")
```

## AgentCore Wrapper

The `AgentCoreWrapper` class provides a robust adapter layer between Strands agents and AgentCore Runtime.

### Features

- **Request Conversion**: Converts AgentCore request format to Strands format
- **Response Conversion**: Converts Strands response format to AgentCore format
- **Error Handling**: Comprehensive error handling with custom exception types
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Timeout Management**: Configurable timeouts with proper cleanup
- **Async Support**: Full async/await support with synchronous wrapper option

### Error Handling

The wrapper intelligently detects and handles different types of errors:

**Retryable Errors** (will retry automatically):

- Throttling exceptions
- Service unavailable errors
- Timeout errors
- Network/connection errors
- Temporary/transient errors

**Non-Retryable Errors** (will fail immediately):

- Validation errors
- Invalid input errors
- Authentication errors
- Resource not found errors

### Configuration

```python
wrapper = AgentCoreWrapper(
    strands_agent=agent,
    agent_name="my-agent",
    max_retries=3,              # Maximum retry attempts
    timeout_seconds=300,         # Execution timeout
    retry_delay_seconds=1.0      # Initial retry delay (exponential backoff)
)
```

## Contract Analysis Entrypoint

The contract analysis entrypoint provides the main interface for AgentCore Runtime.

### Entrypoints

#### `analyze_contract`

Main entrypoint for comprehensive contract analysis.

**Parameters**:

- `contract_text` (str, optional): Contract text to analyze
- `s3_bucket` (str, optional): S3 bucket containing contract
- `s3_key` (str, optional): S3 key for contract document
- `file_size` (int, optional): File size in bytes
- `jurisdiction` (str): Legal jurisdiction (default: "US")
- `user_id` (str): User identifier (default: "anonymous")
- `session_id` (str, optional): Session ID (auto-generated if not provided)
- `include_deviation_analysis` (bool): Include deviation detection (default: True)
- `include_obligation_extraction` (bool): Extract obligations (default: True)
- `min_confidence` (float): Confidence threshold (default: 0.7)

**Returns**: Structured analysis result with contract type, key terms, risks, compliance, etc.

#### `quick_analysis`

Faster analysis with reduced scope.

**Parameters**:

- `contract_text` (str): Contract text to analyze
- `jurisdiction` (str): Legal jurisdiction (default: "US")
- `user_id` (str): User identifier (default: "anonymous")
- `session_id` (str, optional): Session ID

**Returns**: Quick analysis result focusing on key terms and basic compliance.

#### `health_check`

Health status check for the agent.

**Returns**: Health status information including agent name, availability, and version.

### Response Format

All entrypoints return a structured response:

```python
{
    "success": bool,
    "analysis_id": str,
    "contract_type": str,
    "executive_summary": str,
    "key_terms": {
        "parties": list,
        "duration": dict,
        "pricing": dict
    },
    "risk_assessment": dict,
    "compliance_analysis": dict,
    "deviation_analysis": dict,  # Optional
    "obligations": list,          # Optional
    "metadata": {
        "user_id": str,
        "session_id": str,
        "jurisdiction": str,
        "timestamp": str,
        "agent_name": str,
        "tools_used": list,
        "analysis_metadata": dict
    },
    "execution_time": float,
    "agent_trace_id": str
}
```

## Testing

### Run All Tests

```bash
# Run wrapper tests
python3 -m pytest tests/test_agentcore_wrapper.py -v

# Run entrypoint tests
python3 -m pytest tests/test_contract_analysis_entrypoint.py -v

# Run all agent tests
python3 -m pytest tests/ -v
```

### Test Coverage

- **AgentCoreWrapper**: 19 tests covering all functionality
- **Contract Analysis Entrypoint**: 15 tests covering all entrypoints
- **Total**: 34 tests, 100% passing

### Local Testing

Test the entrypoint locally:

```bash
python3 agents/contract_analysis_entrypoint.py
```

This will run a sample contract analysis and health check.

## Architecture

```
┌─────────────────────────────────────────┐
│      AgentCore Runtime                  │
│  ┌───────────────────────────────────┐  │
│  │  contract_analysis_entrypoint.py  │  │
│  │  - @app.entrypoint functions      │  │
│  │  - analyze_contract()             │  │
│  │  - quick_analysis()               │  │
│  │  - health_check()                 │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      AgentCoreWrapper                   │
│  ┌───────────────────────────────────┐  │
│  │  agentcore_wrapper.py             │  │
│  │  - Request conversion             │  │
│  │  - Retry logic                    │  │
│  │  - Error handling                 │  │
│  │  - Response conversion            │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Strands Agent                      │
│  ┌───────────────────────────────────┐  │
│  │  ContractAnalysisAgent            │  │
│  │  - analyze_contract()             │  │
│  │  - 13+ specialized tools          │  │
│  │  - AWS Bedrock integration        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Next Steps

The following enhancements are planned:

1. **Gateway Integration** (Task 4.3)

   - Integrate with AgentCore Gateway for tool invocation
   - Use MCP protocol for tool calls
   - Handle OAuth authentication

2. **Memory Integration** (Task 4.4)

   - Store analysis results in AgentCore Memory
   - Retrieve previous analyses for context
   - Manage session and long-term memory

3. **Observability** (Task 4.5)
   - Add OpenTelemetry tracing
   - Record metrics for analysis time and tool usage
   - Export traces to CloudWatch and X-Ray

## Requirements

- Python 3.8+
- boto3 >= 1.34.0
- strands-agents >= 0.1.0
- pytest >= 7.4.0 (for testing)
- pytest-asyncio >= 0.21.0 (for testing)

## Documentation

- **Implementation Summary**: `../TASK_4_IMPLEMENTATION_SUMMARY.md`
- **Status**: `../TASK_4_STATUS.md`
- **Design Document**: `../.kiro/specs/agentcore-migration/design.md`
- **Requirements**: `../.kiro/specs/agentcore-migration/requirements.md`

## Support

For issues or questions:

1. Check the implementation summary and status documents
2. Review the test files for usage examples
3. Consult the design document for architecture details
