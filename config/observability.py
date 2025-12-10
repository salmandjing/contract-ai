"""Observability instrumentation for AgentCore agents."""
import time
import json
from typing import Dict, Any, Optional
from functools import wraps
from datetime import datetime

from .aws_config import aws_config
from .agentcore_config import agentcore_config


class ObservabilityInstrumentation:
    """Instrumentation for tracing, metrics, and logging."""
    
    def __init__(self, service_name: str = "contract-analysis-platform"):
        self.service_name = service_name
        self.cloudwatch_client = aws_config.get_cloudwatch_client()
        self.logs_client = aws_config.get_client('logs')
        self.log_group = agentcore_config.cloudwatch_log_group
        self.metrics_namespace = "ContractAI/AgentCore"
        
        # Enable/disable based on config
        self.tracing_enabled = agentcore_config.enable_tracing
        self.metrics_enabled = agentcore_config.enable_metrics
    
    def trace_agent_execution(self, agent_name: str):
        """Decorator to trace agent execution."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                if not self.tracing_enabled:
                    return await func(*args, **kwargs)
                
                trace_id = self._generate_trace_id()
                start_time = time.time()
                
                # Log start
                self._log_event({
                    'trace_id': trace_id,
                    'agent_name': agent_name,
                    'event': 'agent_start',
                    'timestamp': datetime.utcnow().isoformat(),
                    'input_size': len(str(args)) + len(str(kwargs))
                })
                
                try:
                    result = await func(*args, **kwargs)
                    execution_time = (time.time() - start_time) * 1000  # ms
                    
                    # Log success
                    self._log_event({
                        'trace_id': trace_id,
                        'agent_name': agent_name,
                        'event': 'agent_complete',
                        'timestamp': datetime.utcnow().isoformat(),
                        'execution_time_ms': execution_time,
                        'success': True
                    })
                    
                    # Record metrics
                    self._record_agent_metrics(agent_name, execution_time, True)
                    
                    return result
                    
                except Exception as e:
                    execution_time = (time.time() - start_time) * 1000
                    
                    # Log error
                    self._log_event({
                        'trace_id': trace_id,
                        'agent_name': agent_name,
                        'event': 'agent_error',
                        'timestamp': datetime.utcnow().isoformat(),
                        'execution_time_ms': execution_time,
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'success': False
                    }, level='ERROR')
                    
                    # Record metrics
                    self._record_agent_metrics(agent_name, execution_time, False)
                    
                    raise
            
            return wrapper
        return decorator
    
    def trace_tool_invocation(self, tool_name: str):
        """Decorator to trace tool invocation."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                if not self.tracing_enabled:
                    return await func(*args, **kwargs)
                
                trace_id = self._generate_trace_id()
                start_time = time.time()
                
                # Log start
                self._log_event({
                    'trace_id': trace_id,
                    'tool_name': tool_name,
                    'event': 'tool_start',
                    'timestamp': datetime.utcnow().isoformat()
                }, stream='tool-invocation')
                
                try:
                    result = await func(*args, **kwargs)
                    execution_time = (time.time() - start_time) * 1000
                    
                    # Log success
                    self._log_event({
                        'trace_id': trace_id,
                        'tool_name': tool_name,
                        'event': 'tool_complete',
                        'timestamp': datetime.utcnow().isoformat(),
                        'execution_time_ms': execution_time,
                        'success': True
                    }, stream='tool-invocation')
                    
                    # Record metrics
                    self._record_tool_metrics(tool_name, execution_time, True)
                    
                    return result
                    
                except Exception as e:
                    execution_time = (time.time() - start_time) * 1000
                    
                    # Log error
                    self._log_event({
                        'trace_id': trace_id,
                        'tool_name': tool_name,
                        'event': 'tool_error',
                        'timestamp': datetime.utcnow().isoformat(),
                        'execution_time_ms': execution_time,
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'success': False
                    }, stream='tool-invocation', level='ERROR')
                    
                    # Record metrics
                    self._record_tool_metrics(tool_name, execution_time, False)
                    
                    raise
            
            return wrapper
        return decorator
    
    def _log_event(self, event: Dict[str, Any], stream: str = 'agent-execution', level: str = 'INFO'):
        """Log event to CloudWatch."""
        try:
            event['level'] = level
            event['service'] = self.service_name
            
            self.logs_client.put_log_events(
                logGroupName=self.log_group,
                logStreamName=stream,
                logEvents=[
                    {
                        'timestamp': int(time.time() * 1000),
                        'message': json.dumps(event)
                    }
                ]
            )
        except Exception as e:
            # Don't fail if logging fails
            print(f"Warning: Failed to log event: {str(e)}")
    
    def _record_agent_metrics(self, agent_name: str, execution_time: float, success: bool):
        """Record agent metrics to CloudWatch."""
        if not self.metrics_enabled:
            return
        
        try:
            metrics = [
                {
                    'MetricName': 'AgentInvocations',
                    'Value': 1.0,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'AgentName', 'Value': agent_name},
                        {'Name': 'Success', 'Value': str(success)}
                    ]
                },
                {
                    'MetricName': 'ExecutionTime',
                    'Value': execution_time,
                    'Unit': 'Milliseconds',
                    'Dimensions': [
                        {'Name': 'AgentName', 'Value': agent_name}
                    ]
                }
            ]
            
            if not success:
                metrics.append({
                    'MetricName': 'ErrorRate',
                    'Value': 100.0,
                    'Unit': 'Percent',
                    'Dimensions': [
                        {'Name': 'AgentName', 'Value': agent_name}
                    ]
                })
            
            self.cloudwatch_client.put_metric_data(
                Namespace=self.metrics_namespace,
                MetricData=metrics
            )
        except Exception as e:
            print(f"Warning: Failed to record metrics: {str(e)}")
    
    def _record_tool_metrics(self, tool_name: str, execution_time: float, success: bool):
        """Record tool metrics to CloudWatch."""
        if not self.metrics_enabled:
            return
        
        try:
            metrics = [
                {
                    'MetricName': 'ToolInvocations',
                    'Value': 1.0,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'ToolName', 'Value': tool_name},
                        {'Name': 'Success', 'Value': str(success)}
                    ]
                },
                {
                    'MetricName': 'ToolExecutionTime',
                    'Value': execution_time,
                    'Unit': 'Milliseconds',
                    'Dimensions': [
                        {'Name': 'ToolName', 'Value': tool_name}
                    ]
                }
            ]
            
            self.cloudwatch_client.put_metric_data(
                Namespace=self.metrics_namespace,
                MetricData=metrics
            )
        except Exception as e:
            print(f"Warning: Failed to record tool metrics: {str(e)}")
    
    def _generate_trace_id(self) -> str:
        """Generate a unique trace ID."""
        import uuid
        return str(uuid.uuid4())
    
    def log_info(self, message: str, **kwargs):
        """Log info message."""
        self._log_event({
            'message': message,
            **kwargs
        }, level='INFO')
    
    def log_error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message."""
        event = {
            'message': message,
            **kwargs
        }
        
        if error:
            event['error'] = str(error)
            event['error_type'] = type(error).__name__
        
        self._log_event(event, stream='errors', level='ERROR')
    
    def record_custom_metric(self, metric_name: str, value: float, unit: str = 'None', dimensions: Optional[Dict[str, str]] = None):
        """Record a custom metric."""
        if not self.metrics_enabled:
            return
        
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit
            }
            
            if dimensions:
                metric_data['Dimensions'] = [
                    {'Name': k, 'Value': v} for k, v in dimensions.items()
                ]
            
            self.cloudwatch_client.put_metric_data(
                Namespace=self.metrics_namespace,
                MetricData=[metric_data]
            )
        except Exception as e:
            print(f"Warning: Failed to record custom metric: {str(e)}")


# Global observability instance
observability = ObservabilityInstrumentation()
