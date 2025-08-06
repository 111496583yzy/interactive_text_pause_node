import json
import uuid
from server import PromptServer
from aiohttp import web
import threading
import time

class InteractiveTextPauseNode:
    
    _instances = []
    _pre_edit_results = {}
    
    def __init__(self):
        self.text_data = {}
        self.edit_results = {}
        InteractiveTextPauseNode._instances.append(self)
        
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {
                    "multiline": True,
                    "default": ""
                }),
                "seed": ("INT", {
                    "default": 0,
                    "min": 0,
                    "max": 0xffffffffffffffff,
                    "step": 1
                })
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "pause_and_edit_text"
    OUTPUT_NODE = True
    CATEGORY = "📝 交互工具"
    
    def pause_and_edit_text(self, text, seed):
        node_id = getattr(self, 'unique_id', 'unknown')
        
        pre_edit_key = f"{node_id}_{text}_{seed}"
        if pre_edit_key in InteractiveTextPauseNode._pre_edit_results:
            edited_text = InteractiveTextPauseNode._pre_edit_results.pop(pre_edit_key)
            print(f"[交互式文本暂停] 使用预编辑结果，节点ID: {node_id}")
            print(f"[交互式文本暂停] 预编辑文本长度: {len(edited_text)} 字符")
            return (edited_text,)
        
        session_id = str(uuid.uuid4())
        
        self.text_data[session_id] = {
            "original_text": text,
            "edited_text": text,
            "completed": False
        }
        
        PromptServer.instance.send_sync("interactive_text_pause", {
            "session_id": session_id,
            "text": text,
            "node_id": node_id,
            "seed": seed
        })
        
        print(f"[交互式文本暂停] 会话 {session_id} 等待用户编辑...")
        print(f"[交互式文本暂停] 原始文本长度: {len(text)} 字符")
        print(f"[交互式文本暂停] 使用种子值: {seed}")
        
        timeout = 300
        start_time = time.time()
        
        while session_id not in self.edit_results:
            if time.time() - start_time > timeout:
                print(f"[交互式文本暂停] 会话 {session_id} 超时，使用原始文本")
                return (text,)
            time.sleep(0.1)
        
        edited_text = self.edit_results.pop(session_id, text)
        print(f"[交互式文本暂停] 会话 {session_id} 编辑完成")
        print(f"[交互式文本暂停] 编辑后文本长度: {len(edited_text)} 字符")
        
        return (edited_text,)


_node_instance = None

@PromptServer.instance.routes.post("/interactive_text/confirm")
async def confirm_text_edit(request):
    global _node_instance
    try:
        data = await request.json()
        session_id = data.get("session_id")
        edited_text = data.get("text", "")
        is_pre_execution = data.get("is_pre_execution", False)
        
        print(f"[交互式文本暂停] 收到编辑确认，会话ID: {session_id}")
        print(f"[交互式文本暂停] 编辑后的文本: {edited_text[:100]}...")
        print(f"[交互式文本暂停] 预执行模式: {is_pre_execution}")
        
        stored = False
        for instance in InteractiveTextPauseNode._instances:
            if session_id in instance.text_data:
                instance.edit_results[session_id] = edited_text
                stored = True
                print(f"[交互式文本暂停] 编辑结果已存储到节点实例")
                break
        
        if not stored:
            print(f"[交互式文本暂停] 警告：未找到对应的节点实例")
        
        return web.json_response({
            "status": "success",
            "message": "文本编辑已确认"
        })
    except Exception as e:
        print(f"[交互式文本暂停] API错误: {str(e)}")
        return web.json_response({
            "status": "error", 
            "message": str(e)
        }, status=500)


@PromptServer.instance.routes.post("/interactive_text/pre_edit")
async def store_pre_edit(request):
    try:
        data = await request.json()
        node_id = data.get("node_id")
        text = data.get("original_text", "")
        seed = data.get("seed", 0)
        edited_text = data.get("edited_text", "")
        
        pre_edit_key = f"{node_id}_{text}_{seed}"
        
        InteractiveTextPauseNode._pre_edit_results[pre_edit_key] = edited_text
        
        print(f"[交互式文本暂停] 存储预编辑结果，节点ID: {node_id}")
        print(f"[交互式文本暂停] 预编辑键: {pre_edit_key}")
        print(f"[交互式文本暂停] 编辑后文本长度: {len(edited_text)} 字符")
        
        return web.json_response({
            "status": "success",
            "message": "预编辑结果已存储"
        })
    except Exception as e:
        print(f"[交互式文本暂停] 预编辑API错误: {str(e)}")
        return web.json_response({
            "status": "error", 
            "message": str(e)
        }, status=500)


NODE_CLASS_MAPPINGS = {
    "InteractiveTextPauseNode": InteractiveTextPauseNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "InteractiveTextPauseNode": "📝 交互式文本暂停编辑器"
} 