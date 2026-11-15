import ast
import operator
import math
import psutil
import datetime
from typing import Dict, Any, Union

# Safe Mathematical Expression Evaluator (Zero eval() usage)
_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

_SAFE_FUNCTIONS = {
    'sqrt': math.sqrt,
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'log': math.log,
    'log10': math.log10,
    'abs': abs,
    'round': round,
    'pi': math.pi,
    'e': math.e,
}

def safe_eval_math(expression: str) -> Union[int, float]:
    """
    Safely evaluate an arithmetic expression using AST parsing.
    Guaranteed safe against code injection and arbitrary execution.
    """
    try:
        clean_expr = expression.replace("x", "*").replace("X", "*").replace("^", "**").strip()
        tree = ast.parse(clean_expr, mode='eval')

        def _eval_node(node):
            if isinstance(node, ast.Expression):
                return _eval_node(node.body)
            elif isinstance(node, ast.Constant):  # Python 3.8+ numeric literals
                if isinstance(node.value, (int, float)):
                    return node.value
                raise ValueError(f"Unsafe literal: {node.value}")
            elif isinstance(node, ast.BinOp):
                left = _eval_node(node.left)
                right = _eval_node(node.right)
                op_type = type(node.op)
                if op_type in _OPERATORS:
                    return _OPERATORS[op_type](left, right)
                raise ValueError(f"Unsupported binary operator: {op_type}")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval_node(node.operand)
                op_type = type(node.op)
                if op_type in _OPERATORS:
                    return _OPERATORS[op_type](operand)
                raise ValueError(f"Unsupported unary operator: {op_type}")
            elif isinstance(node, ast.Call):
                func_name = getattr(node.func, 'id', None)
                if func_name in _SAFE_FUNCTIONS:
                    args = [_eval_node(arg) for arg in node.args]
                    return _SAFE_FUNCTIONS[func_name](*args)
                raise ValueError(f"Function '{func_name}' is not permitted.")
            elif isinstance(node, ast.Name):
                if node.id in _SAFE_FUNCTIONS:
                    return _SAFE_FUNCTIONS[node.id]
                raise ValueError(f"Identifier '{node.id}' not allowed.")
            else:
                raise ValueError(f"Unsafe node: {type(node).__name__}")

        result = _eval_node(tree)
        if isinstance(result, float) and result.is_integer():
            return int(result)
        return round(result, 6)
    except ZeroDivisionError:
        raise ValueError("Division by zero is undefined.")
    except Exception as e:
        raise ValueError(f"Calculation error: {str(e)}")

def get_system_telemetry() -> Dict[str, Any]:
    """Retrieve actual hardware telemetry and system health."""
    try:
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count(logical=True)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        battery = None
        try:
            bat = psutil.sensors_battery()
            if bat:
                battery = {
                    "percent": round(bat.percent, 1),
                    "power_plugged": bat.power_plugged,
                    "secsleft": bat.secsleft if bat.secsleft != psutil.POWER_TIME_UNLIMITED else -1
                }
        except Exception:
            battery = None

        return {
            "status": "healthy",
            "timestamp": datetime.datetime.now().isoformat(),
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": cpu_count
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            },
            "battery": battery
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
