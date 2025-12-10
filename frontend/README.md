# AgentCore Frontend

This is the frontend application for the Contract AI Platform migrated to AWS Bedrock AgentCore.

## Features

- **OAuth Authentication**: Secure login using Amazon Cognito
- **Contract Analysis**: Single contract analysis using AgentCore Runtime
- **Contract Comparison**: Side-by-side comparison of two contracts
- **Batch Processing**: Process multiple contracts in parallel
- **Observability Dashboard**: Real-time monitoring of agent performance and traces

## Architecture

The frontend is built with vanilla JavaScript and follows a modular architecture:

```
frontend/
├── index.html              # Main HTML file
├── css/
│   ├── styles.css          # Base styles
│   ├── auth.css            # Authentication styles
│   └── dashboard.css       # Dashboard and observability styles
└── js/
    ├── config.js           # Configuration management
    ├── auth.js             # OAuth authentication
    ├── api-client.js       # AgentCore API client
    ├── utils.js            # Utility functions
    ├── components.js       # Reusable UI components
    ├── app.js              # Main application
    ├── analyze-tab.js      # Contract analysis tab
    ├── compare-tab.js      # Contract comparison tab
    ├── batch-tab.js        # Batch processing tab
    └── observability-tab.js # Observability dashboard tab
```

## Setup

### Prerequisites

1. AWS Account with Bedrock AgentCore access
2. Amazon Cognito User Pool configured
3. AgentCore Gateway, Runtime, Memory, and Observability set up

### Configuration

1. Update the backend to serve the configuration endpoint at `/api/config`:

```python
@app.route('/api/config')
def get_config():
    return jsonify({
        'cognito': {
            'userPoolId': os.getenv('COGNITO_USER_POOL_ID'),
            'clientId': os.getenv('COGNITO_CLIENT_ID'),
            'domain': os.getenv('COGNITO_DOMAIN'),
            'region': os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
        },
        'agentcore': {
            'gatewayId': os.getenv('AGENTCORE_GATEWAY_ID'),
            'gatewayEndpoint': os.getenv('AGENTCORE_GATEWAY_ENDPOINT'),
            'region': os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
        }
    })
```

2. Set environment variables in `.env`:

```bash
# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com

# AgentCore Configuration
AGENTCORE_GATEWAY_ID=gateway-xxxxx
AGENTCORE_GATEWAY_ENDPOINT=https://xxxxx.execute-api.us-east-1.amazonaws.com
```

### Running Locally

1. Serve the frontend files using a local web server:

```bash
# Using Python
cd frontend
python -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

2. Open your browser to `http://localhost:8080`

### Deployment

The frontend can be deployed to:

- **Amazon S3 + CloudFront**: Static website hosting
- **AWS Amplify**: Automated deployment with CI/CD
- **Any web server**: Apache, Nginx, etc.

## Usage

### Authentication

1. Click "Sign in with Cognito" on the login screen
2. You'll be redirected to the Cognito hosted UI
3. After successful login, you'll be redirected back to the application

### Contract Analysis

1. Navigate to the "Analyze" tab
2. Paste contract text or upload a file
3. Select jurisdiction and options
4. Click "Analyze Contract"
5. View results and optionally view the trace in the Observability dashboard

### Contract Comparison

1. Navigate to the "Compare" tab
2. Enter or upload two contracts
3. Select jurisdiction
4. Click "Compare Contracts"
5. View side-by-side comparison and differences

### Batch Processing

1. Navigate to the "Batch" tab
2. Upload multiple contract files
3. Select jurisdiction
4. Click "Process Batch"
5. Monitor progress in real-time
6. Download individual or all results

### Observability Dashboard

1. Navigate to the "Observability" tab
2. View agent performance metrics
3. See tool usage statistics
4. Browse recent analyses
5. Search for specific traces by trace ID

## API Endpoints

The frontend expects the following backend endpoints:

### Configuration

- `GET /api/config` - Get application configuration

### Health Check

- `GET /api/health` - Check backend health

### AgentCore Operations

- `POST /api/agentcore/analyze` - Analyze single contract
- `POST /api/agentcore/compare` - Compare two contracts
- `POST /api/agentcore/obligations` - Extract obligations
- `POST /api/agentcore/batch` - Process batch of contracts
- `GET /api/agentcore/batch/:batchId` - Get batch status

### Observability

- `GET /api/agentcore/observability/trace/:traceId` - Get trace details
- `GET /api/agentcore/observability/metrics?timeRange=1h` - Get agent metrics
- `GET /api/agentcore/observability/tools?timeRange=1h` - Get tool usage stats

### Memory

- `GET /api/agentcore/memory/analyses?limit=10` - Get recent analyses
- `GET /api/agentcore/memory/analyses/:analysisId` - Get specific analysis

## Security

- All API requests include OAuth Bearer token in Authorization header
- Tokens are automatically refreshed before expiration
- Session data is stored in localStorage
- CSRF protection via state parameter in OAuth flow

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### Authentication Issues

1. Check Cognito configuration in `.env`
2. Verify redirect URI is configured in Cognito App Client
3. Check browser console for errors

### API Errors

1. Verify backend is running and accessible
2. Check network tab for failed requests
3. Ensure OAuth token is valid

### Observability Data Not Loading

1. Verify AgentCore Observability is enabled
2. Check that traces are being generated
3. Ensure proper IAM permissions for CloudWatch/X-Ray access

## Development

### Adding New Features

1. Create new JavaScript module in `js/` directory
2. Add corresponding styles in `css/` directory
3. Update `index.html` to include new scripts
4. Follow existing patterns for API calls and error handling

### Code Style

- Use ES6+ features
- Follow existing naming conventions
- Add JSDoc comments for functions
- Handle errors gracefully with user-friendly messages

## License

Copyright © 2025. All rights reserved.
