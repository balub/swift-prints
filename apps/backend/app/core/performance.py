"""
Performance monitoring and profiling utilities.
"""
import time
import psutil
import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager, contextmanager
import logging
from functools import wraps
import threading
from collections import defaultdict, deque

from .cache import cache_service

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class RequestMetrics:
    """Request performance metrics."""
    endpoint: str
    method: str
    status_code: int
    duration: float
    memory_usage: float
    cpu_usage: float
    timestamp: datetime
    user_id: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


class PerformanceMonitor:
    """System performance monitoring."""

    def __init__(self):
        self.metrics_buffer = deque(maxlen=1000)
        self.request_metrics = deque(maxlen=5000)
        self.alert_thresholds = {
            'cpu_usage': 80.0,
            'memory_usage': 85.0,
            'disk_usage': 90.0,
            'response_time': 5.0,  # seconds
            'error_rate': 10.0  # percentage
        }
        self.monitoring_active = False
        self._lock = threading.Lock()

    def start_monitoring(self, interval: int = 60):
        """Start background performance monitoring."""
        if self.monitoring_active:
            return

        self.monitoring_active = True

        def monitor_loop():
            while self.monitoring_active:
                try:
                    self._collect_system_metrics()
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"Error in performance monitoring: {e}")

        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()
        logger.info("Performance monitoring started")

    def stop_monitoring(self):
        """Stop background performance monitoring."""
        self.monitoring_active = False
        logger.info("Performance monitoring stopped")

    def _collect_system_metrics(self):
        """Collect system performance metrics."""
        try:
            now = datetime.utcnow()

            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self._add_metric("cpu_usage", cpu_percent, "percent", now)

            # Memory metrics
            memory = psutil.virtual_memory()
            self._add_metric("memory_usage", memory.percent, "percent", now)
            self._add_metric("memory_available",
                             memory.available / (1024**3), "GB", now)

            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self._add_metric("disk_usage", disk_percent, "percent", now)
            self._add_metric("disk_free", disk.free / (1024**3), "GB", now)

            # Network metrics
            network = psutil.net_io_counters()
            self._add_metric("network_bytes_sent",
                             network.bytes_sent, "bytes", now)
            self._add_metric("network_bytes_recv",
                             network.bytes_recv, "bytes", now)

            # Process metrics
            process = psutil.Process()
            self._add_metric("process_memory",
                             process.memory_info().rss / (1024**2), "MB", now)
            self._add_metric(
                "process_cpu", process.cpu_percent(), "percent", now)

            # Check for alerts
            self._check_alerts(cpu_percent, memory.percent, disk_percent)

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

    def _add_metric(self, name: str, value: float, unit: str, timestamp: datetime, tags: Dict[str, str] = None):
        """Add a metric to the buffer."""
        metric = PerformanceMetric(name, value, unit, timestamp, tags)

        with self._lock:
            self.metrics_buffer.append(metric)

        # Cache recent metrics
        cache_key = f"metrics:{name}:latest"
        cache_service.set(cache_key, metric.to_dict(), ttl=300)

    def _check_alerts(self, cpu_usage: float, memory_usage: float, disk_usage: float):
        """Check if any metrics exceed alert thresholds."""
        alerts = []

        if cpu_usage > self.alert_thresholds['cpu_usage']:
            alerts.append(f"High CPU usage: {cpu_usage:.1f}%")

        if memory_usage > self.alert_thresholds['memory_usage']:
            alerts.append(f"High memory usage: {memory_usage:.1f}%")

        if disk_usage > self.alert_thresholds['disk_usage']:
            alerts.append(f"High disk usage: {disk_usage:.1f}%")

        for alert in alerts:
            logger.warning(f"Performance Alert: {alert}")

    def add_request_metric(self, metrics: RequestMetrics):
        """Add request performance metrics."""
        with self._lock:
            self.request_metrics.append(metrics)

        # Cache request metrics
        cache_key = f"request_metrics:{metrics.endpoint}:{int(time.time())}"
        cache_service.set(cache_key, metrics.to_dict(), ttl=3600)

    def get_system_metrics(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get system metrics from the last N minutes."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        with self._lock:
            recent_metrics = [
                metric.to_dict()
                for metric in self.metrics_buffer
                if metric.timestamp >= cutoff_time
            ]

        return recent_metrics

    def get_request_metrics(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get request metrics from the last N minutes."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        with self._lock:
            recent_metrics = [
                metric.to_dict()
                for metric in self.request_metrics
                if metric.timestamp >= cutoff_time
            ]

        return recent_metrics

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary statistics."""
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)

        with self._lock:
            # System metrics summary
            recent_system_metrics = [
                metric for metric in self.metrics_buffer
                if metric.timestamp >= last_hour
            ]

            # Request metrics summary
            recent_request_metrics = [
                metric for metric in self.request_metrics
                if metric.timestamp >= last_hour
            ]

        # Calculate averages
        cpu_metrics = [
            m.value for m in recent_system_metrics if m.name == 'cpu_usage']
        memory_metrics = [
            m.value for m in recent_system_metrics if m.name == 'memory_usage']

        # Request statistics
        response_times = [m.duration for m in recent_request_metrics]
        error_count = len(
            [m for m in recent_request_metrics if m.status_code >= 400])
        total_requests = len(recent_request_metrics)

        return {
            'system': {
                'avg_cpu_usage': sum(cpu_metrics) / len(cpu_metrics) if cpu_metrics else 0,
                'avg_memory_usage': sum(memory_metrics) / len(memory_metrics) if memory_metrics else 0,
                'metrics_collected': len(recent_system_metrics)
            },
            'requests': {
                'total_requests': total_requests,
                'error_count': error_count,
                'error_rate': (error_count / total_requests * 100) if total_requests > 0 else 0,
                'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
                'max_response_time': max(response_times) if response_times else 0,
                'min_response_time': min(response_times) if response_times else 0
            },
            'timestamp': now.isoformat()
        }

    def get_endpoint_performance(self, endpoint: str, minutes: int = 60) -> Dict[str, Any]:
        """Get performance metrics for a specific endpoint."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        with self._lock:
            endpoint_metrics = [
                metric for metric in self.request_metrics
                if metric.endpoint == endpoint and metric.timestamp >= cutoff_time
            ]

        if not endpoint_metrics:
            return {'endpoint': endpoint, 'metrics': [], 'summary': {}}

        response_times = [m.duration for m in endpoint_metrics]
        error_count = len(
            [m for m in endpoint_metrics if m.status_code >= 400])

        return {
            'endpoint': endpoint,
            'total_requests': len(endpoint_metrics),
            'error_count': error_count,
            'error_rate': (error_count / len(endpoint_metrics) * 100),
            'avg_response_time': sum(response_times) / len(response_times),
            'max_response_time': max(response_times),
            'min_response_time': min(response_times),
            'p95_response_time': self._calculate_percentile(response_times, 95),
            'p99_response_time': self._calculate_percentile(response_times, 99)
        }

    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value."""
        if not values:
            return 0.0

        sorted_values = sorted(values)
        index = int((percentile / 100) * len(sorted_values))
        return sorted_values[min(index, len(sorted_values) - 1)]


class PerformanceProfiler:
    """Code profiling utilities."""

    def __init__(self):
        self.profiles = defaultdict(list)
        self._lock = threading.Lock()

    @contextmanager
    def profile(self, name: str, tags: Dict[str, str] = None):
        """Context manager for profiling code blocks."""
        start_time = time.perf_counter()
        start_memory = psutil.Process().memory_info().rss

        try:
            yield
        finally:
            end_time = time.perf_counter()
            end_memory = psutil.Process().memory_info().rss

            duration = end_time - start_time
            memory_delta = end_memory - start_memory

            profile_data = {
                'name': name,
                'duration': duration,
                'memory_delta': memory_delta,
                'timestamp': datetime.utcnow().isoformat(),
                'tags': tags or {}
            }

            with self._lock:
                self.profiles[name].append(profile_data)

    @asynccontextmanager
    async def async_profile(self, name: str, tags: Dict[str, str] = None):
        """Async context manager for profiling code blocks."""
        start_time = time.perf_counter()
        start_memory = psutil.Process().memory_info().rss

        try:
            yield
        finally:
            end_time = time.perf_counter()
            end_memory = psutil.Process().memory_info().rss

            duration = end_time - start_time
            memory_delta = end_memory - start_memory

            profile_data = {
                'name': name,
                'duration': duration,
                'memory_delta': memory_delta,
                'timestamp': datetime.utcnow().isoformat(),
                'tags': tags or {}
            }

            with self._lock:
                self.profiles[name].append(profile_data)

    def get_profile_stats(self, name: str) -> Dict[str, Any]:
        """Get statistics for a specific profile."""
        with self._lock:
            profile_data = self.profiles.get(name, [])

        if not profile_data:
            return {'name': name, 'count': 0}

        durations = [p['duration'] for p in profile_data]
        memory_deltas = [p['memory_delta'] for p in profile_data]

        return {
            'name': name,
            'count': len(profile_data),
            'avg_duration': sum(durations) / len(durations),
            'max_duration': max(durations),
            'min_duration': min(durations),
            'total_duration': sum(durations),
            'avg_memory_delta': sum(memory_deltas) / len(memory_deltas),
            'max_memory_delta': max(memory_deltas),
            'min_memory_delta': min(memory_deltas)
        }

    def get_all_profiles(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all profiles."""
        with self._lock:
            profile_names = list(self.profiles.keys())

        return {name: self.get_profile_stats(name) for name in profile_names}

    def clear_profiles(self, name: Optional[str] = None):
        """Clear profile data."""
        with self._lock:
            if name:
                self.profiles.pop(name, None)
            else:
                self.profiles.clear()


def performance_monitor(name: str = None, tags: Dict[str, str] = None):
    """Decorator for monitoring function performance."""
    def decorator(func: Callable):
        monitor_name = name or f"{func.__module__}.{func.__name__}"

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            async with profiler.async_profile(monitor_name, tags):
                return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            with profiler.profile(monitor_name, tags):
                return func(*args, **kwargs)

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# Global instances
monitor = PerformanceMonitor()
profiler = PerformanceProfiler()

# Start monitoring by default
monitor.start_monitoring()
