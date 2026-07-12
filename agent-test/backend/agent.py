"""
AssetFlow Agent - Agentic loop with Ollama tool-calling.
"""
import requests
import json
from backend.tools import TOOL_SCHEMAS, TOOL_FUNCTIONS

OLLAMA_URL = 'http://localhost:11434/api/chat'
MODEL = 'qwen2.5:7b-instruct'
MAX_ITERATIONS = 6

SYSTEM_PROMPT = """You are AssetFlow Agent, an intelligent assistant for manufacturing asset management. You have access to a real database of manufacturing assets, employees, maintenance records, and bookings across multiple plants.

When a user asks a question:
1. Think about which tool(s) you need to answer it
2. Call the appropriate tool(s)
3. Analyze the results
4. If you need more information, call additional tools
5. Provide a clear, helpful answer based on the data

Always be specific with numbers and names from the actual data. If a question requires multiple lookups, do them sequentially.

Available asset categories: CNC Machine, Forklift, Conveyor Belt, Compressor, Generator, Laptop, Meeting Room, Vehicle, Welding Station, 3D Printer.
Asset statuses: Available, Allocated, Under Maintenance, Reserved, Retired.
Plants: Detroit Manufacturing Hub (Detroit), Austin Tech Center (Austin), Chicago Distribution Center (Chicago)."""


def run_agent(user_message: str, conversation_history: list, db_path: str) -> dict:
    """
    Execute the agentic loop:
    1. Send user message + tools to the LLM
    2. If the LLM requests tool calls, execute them and feed results back
    3. Repeat until the LLM gives a final text answer or MAX_ITERATIONS is hit
    """
    trace = []
    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT}
    ]

    # Add conversation history
    for msg in conversation_history:
        messages.append(msg)

    messages.append({'role': 'user', 'content': user_message})

    for iteration in range(MAX_ITERATIONS):
        # Call Ollama
        payload = {
            'model': MODEL,
            'messages': messages,
            'tools': TOOL_SCHEMAS,
            'stream': False,
        }

        try:
            response = requests.post(OLLAMA_URL, json=payload, timeout=120)
            response.raise_for_status()
        except requests.RequestException as e:
            return {
                'answer': f'Error communicating with Ollama: {str(e)}',
                'trace': trace,
            }

        result = response.json()
        assistant_message = result['message']
        messages.append(assistant_message)

        # Check if model wants to call tools
        if 'tool_calls' not in assistant_message or not assistant_message['tool_calls']:
            # Model gave a final text answer
            return {
                'answer': assistant_message.get('content', ''),
                'trace': trace,
            }

        # Execute each tool call
        for tool_call in assistant_message['tool_calls']:
            func_name = tool_call['function']['name']
            func_args = tool_call['function'].get('arguments', {})

            print(f"[Agent] Iteration {iteration + 1} | Tool call: {func_name}({json.dumps(func_args)})")

            # Execute the function
            if func_name in TOOL_FUNCTIONS:
                try:
                    tool_result = TOOL_FUNCTIONS[func_name](db_path, **func_args)
                except Exception as e:
                    tool_result = {'error': str(e)}
            else:
                tool_result = {'error': f'Unknown tool: {func_name}'}

            result_str = json.dumps(tool_result, default=str)
            print(f"[Agent] Result preview: {result_str[:500]}")

            trace.append({
                'tool': func_name,
                'arguments': func_args,
                'result': tool_result,
            })

            # Add tool result to messages
            messages.append({
                'role': 'tool',
                'content': result_str,
            })

    # Max iterations reached - force a final answer
    messages.append({
        'role': 'user',
        'content': 'Please provide your final answer based on the information gathered so far.',
    })
    payload = {
        'model': MODEL,
        'messages': messages,
        'stream': False,
    }
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        return {
            'answer': result['message'].get(
                'content',
                'Max iterations reached. Here is what I found so far based on the tool calls above.'
            ),
            'trace': trace,
        }
    except requests.RequestException as e:
        return {
            'answer': f'Max iterations reached. Error getting final answer: {str(e)}',
            'trace': trace,
        }
