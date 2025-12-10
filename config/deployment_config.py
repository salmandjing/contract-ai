"""
Deployment configuration for AgentCore Runtime agents.

This module provides configuration settings for deploying agents to
AWS Bedrock AgentCore Runtime, including memory allocation, timeout
settings, and environment variables.
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class AgentDeploymentConfig:
    """Configuration for deploying agents to AgentCore Runtime."""
    
    # Agent configuration
    AGENT_NAME = "contract-analysis-agent"
    AGENT_DESCRIPTION = "Contract analysis agent for Power Purchase Agreements and other contracts"
    AGENT_VERSION = "1.0.0"
    
    # Resource configuration
    MEMORY_MB = 2048  # 2 GB memory allocation
    TIMEOUT_SECONDS = 300  # 5 minutes timeout
    
    # Environment configuration
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    
    # AgentCore service IDs (from .env)
    GATEWAY_ID = os.getenv('AGENTCORE_GATEWAY_ID')
    GATEWAY_ENDPOINT = os.getenv('AGENTCORE_GATEWAY_ENDPOINT')
    MEMORY_NAMESPACE = os.getenv('AGENTCORE_MEMORY_NAMESPACE', 'contract-analyses')
    IDENTITY_PROVIDER_ID = os.getenv('AGENTCORE_IDENTITY_PROVIDER_ID')
    
    # AWS configuration
    AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    AWS_ACCOUNT_ID = os.getenv('AWS_ACCOUNT_ID')
    
    # Observability configuration
    ENABLE_TRACING = os.getenv('ENABLE_TRACING', 'true').lower() == 'true'
    ENABLE_METRICS = os.getenv('ENABLE_METRICS', 'true').lower() == 'true'
    CLOUDWATCH_LOG_GROUP = os.getenv('CLOUDWATCH_LOG_GROUP', '/aws/agentcore/contract-platform')
    
    @classmethod
    def get_environment_variables(cls) -> Dict[str, str]:
        """
        Get environment variables to pass to the deployed agent.
        
        Returns:
            Dictionary of environment variable names and values
        """
        return {
            'AGENTCORE_GATEWAY_ID': cls.GATEWAY_ID or '',
            'AGENTCORE_GATEWAY_ENDPOINT': cls.GATEWAY_ENDPOINT or '',
            'AGENTCORE_MEMORY_NAMESPACE': cls.MEMORY_NAMESPACE,
            'AGENTCORE_IDENTITY_PROVIDER_ID': cls.IDENTITY_PROVIDER_ID or '',
            'AWS_DEFAULT_REGION': cls.AWS_REGION,
            'AWS_ACCOUNT_ID': cls.AWS_ACCOUNT_ID or '',
            'ENVIRONMENT': cls.ENVIRONMENT,
            'ENABLE_TRACING': str(cls.ENABLE_TRACING).lower(),
            'ENABLE_METRICS': str(cls.ENABLE_METRICS).lower(),
            'CLOUDWATCH_LOG_GROUP': cls.CLOUDWATCH_LOG_GROUP,
        }
    
    @classmethod
    def get_agent_config(cls) -> Dict[str, Any]:
        """
        Get complete agent configuration for deployment.
        
        Returns:
            Dictionary containing all agent configuration settings
        """
        return {
            'name': cls.AGENT_NAME,
            'description': cls.AGENT_DESCRIPTION,
            'version': cls.AGENT_VERSION,
            'memory_mb': cls.MEMORY_MB,
            'timeout_seconds': cls.TIMEOUT_SECONDS,
            'environment': cls.ENVIRONMENT,
            'environment_variables': cls.get_environment_variables(),
            'tags': cls.get_tags()
        }
    
    @classmethod
    def get_tags(cls) -> Dict[str, str]:
        """
        Get resource tags for the deployed agent.
        
        Returns:
            Dictionary of tag names and values
        """
        return {
            'Service': 'contract-analysis',
            'Environment': cls.ENVIRONMENT,
            'Version': cls.AGENT_VERSION,
            'ManagedBy': 'AgentCore',
            'Project': 'ContractAI-Platform',
            'Component': 'AgentCore-Runtime'
        }
    
    @classmethod
    def validate_configuration(cls) -> tuple[bool, list[str]]:
        """
        Validate that all required configuration is present.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check required AgentCore service IDs
        if not cls.GATEWAY_ID:
            errors.append("AGENTCORE_GATEWAY_ID is not configured")
        
        if not cls.GATEWAY_ENDPOINT:
            errors.append("AGENTCORE_GATEWAY_ENDPOINT is not configured")
        
        if not cls.IDENTITY_PROVIDER_ID:
            errors.append("AGENTCORE_IDENTITY_PROVIDER_ID is not configured")
        
        # Check AWS configuration
        if not cls.AWS_ACCOUNT_ID:
            errors.append("AWS_ACCOUNT_ID is not configured")
        
        # Check resource limits
        if cls.MEMORY_MB < 128:
            errors.append(f"MEMORY_MB ({cls.MEMORY_MB}) is too low (minimum: 128)")
        
        if cls.MEMORY_MB > 10240:
            errors.append(f"MEMORY_MB ({cls.MEMORY_MB}) is too high (maximum: 10240)")
        
        if cls.TIMEOUT_SECONDS < 1:
            errors.append(f"TIMEOUT_SECONDS ({cls.TIMEOUT_SECONDS}) is too low (minimum: 1)")
        
        if cls.TIMEOUT_SECONDS > 900:
            errors.append(f"TIMEOUT_SECONDS ({cls.TIMEOUT_SECONDS}) is too high (maximum: 900)")
        
        return (len(errors) == 0, errors)
    
    @classmethod
    def print_configuration(cls):
        """Print the current deployment configuration."""
        print("=" * 70)
        print("AgentCore Deployment Configuration")
        print("=" * 70)
        print(f"\nAgent Configuration:")
        print(f"  Name:        {cls.AGENT_NAME}")
        print(f"  Description: {cls.AGENT_DESCRIPTION}")
        print(f"  Version:     {cls.AGENT_VERSION}")
        print(f"\nResource Configuration:")
        print(f"  Memory:      {cls.MEMORY_MB} MB")
        print(f"  Timeout:     {cls.TIMEOUT_SECONDS} seconds")
        print(f"  Environment: {cls.ENVIRONMENT}")
        print(f"\nAgentCore Services:")
        print(f"  Gateway ID:          {cls.GATEWAY_ID or 'NOT CONFIGURED'}")
        print(f"  Gateway Endpoint:    {cls.GATEWAY_ENDPOINT or 'NOT CONFIGURED'}")
        print(f"  Memory Namespace:    {cls.MEMORY_NAMESPACE}")
        print(f"  Identity Provider:   {cls.IDENTITY_PROVIDER_ID or 'NOT CONFIGURED'}")
        print(f"\nAWS Configuration:")
        print(f"  Region:      {cls.AWS_REGION}")
        print(f"  Account ID:  {cls.AWS_ACCOUNT_ID or 'NOT CONFIGURED'}")
        print(f"\nObservability:")
        print(f"  Tracing:     {'Enabled' if cls.ENABLE_TRACING else 'Disabled'}")
        print(f"  Metrics:     {'Enabled' if cls.ENABLE_METRICS else 'Disabled'}")
        print(f"  Log Group:   {cls.CLOUDWATCH_LOG_GROUP}")
        print(f"\nEnvironment Variables:")
        for key, value in cls.get_environment_variables().items():
            # Mask sensitive values
            if 'SECRET' in key or 'KEY' in key:
                display_value = '***' if value else 'NOT SET'
            else:
                display_value = value or 'NOT SET'
            print(f"  {key}: {display_value}")
        print(f"\nTags:")
        for key, value in cls.get_tags().items():
            print(f"  {key}: {value}")
        print("=" * 70)
        
        # Validate configuration
        is_valid, errors = cls.validate_configuration()
        if not is_valid:
            print("\n⚠️  Configuration Validation Errors:")
            for error in errors:
                print(f"  - {error}")
            print()
        else:
            print("\n✓ Configuration is valid")
            print()


# Create a global instance for easy access
deployment_config = AgentDeploymentConfig()


if __name__ == "__main__":
    # Print configuration when run directly
    AgentDeploymentConfig.print_configuration()
