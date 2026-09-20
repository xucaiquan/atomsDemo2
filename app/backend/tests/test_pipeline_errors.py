"""模型上游故障分类回归测试。"""

import asyncio

from httpx import ConnectError, Request, TimeoutException

from services.pipeline import _classify_upstream_error


def test_timeout_is_retriable():
    error_type, message, retriable = _classify_upstream_error(asyncio.TimeoutError())
    assert error_type == "timeout"
    assert "超时" in message
    assert retriable is True


def test_httpx_timeout_is_retriable():
    error_type, _, retriable = _classify_upstream_error(
        TimeoutException("timeout", request=Request("POST", "https://example.test"))
    )
    assert error_type == "timeout"
    assert retriable is True


def test_connection_is_retriable():
    error_type, message, retriable = _classify_upstream_error(
        ConnectError("offline", request=Request("POST", "https://example.test"))
    )
    assert error_type == "connection"
    assert "连接失败" in message
    assert retriable is True


def test_unknown_programming_error_is_not_retried():
    error_type, _, retriable = _classify_upstream_error(RuntimeError("bug"))
    assert error_type == "unknown"
    assert retriable is False
