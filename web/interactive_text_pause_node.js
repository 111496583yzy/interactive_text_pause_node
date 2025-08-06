import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { api } from "../../scripts/api.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = "extensions/interactive_text_pause_node/interactive_text_pause_node.css";
document.head.appendChild(link);

app.registerExtension({
    name: "InteractiveTextPauseNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "InteractiveTextPauseNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.title = "📝 交互式文本暂停编辑器";
                
                return r;
            };
        }
    }
});

let currentEditSession = null;
let editOverlay = null;
let pendingEdits = new Map();

api.addEventListener("interactive_text_pause", (event) => {
    const { session_id, text, node_id, seed } = event.detail;
    console.log("[交互式文本暂停] 收到暂停信号:", { session_id, text, node_id, seed });
    
    showTextEditor(session_id, text, node_id, seed);
});

api.addEventListener("execution_start", (event) => {
    console.log("[交互式文本暂停] 工作流开始执行");
    checkForInteractiveNodes();
});

function checkForInteractiveNodes() {
    try {
        const workflow = app.graph;
        if (!workflow) return;
        
        const interactiveNodes = workflow._nodes.filter(node => 
            node.type === "InteractiveTextPauseNode"
        );
        
        console.log(`[交互式文本暂停] 发现 ${interactiveNodes.length} 个交互式节点`);
        
        interactiveNodes.forEach(node => {
            preProcessInteractiveNode(node);
        });
        
    } catch (error) {
        console.error("[交互式文本暂停] 检查交互式节点时出错:", error);
    }
}

function preProcessInteractiveNode(node) {
    try {
        let text = "";
        let seed = 0;
        
        if (node.widgets) {
            const textWidget = node.widgets.find(w => w.name === "text");
            const seedWidget = node.widgets.find(w => w.name === "seed");
            
            if (textWidget) {
                text = textWidget.value || "";
            }
            if (seedWidget) {
                seed = seedWidget.value || 0;
            }
        }
        
        if (!text && node.inputs) {
            const textInput = node.inputs.find(input => input.name === "text");
            if (textInput && textInput.link) {
                console.log(`[交互式文本暂停] 节点 ${node.id} 的文本输入来自连接，无法预处理`);
                return;
            }
        }
        
        if (text) {
            const sessionId = `pre_${node.id}_${Date.now()}`;
            
            console.log(`[交互式文本暂停] 预处理节点 ${node.id}, 文本长度: ${text.length}`);
            
            showTextEditor(sessionId, text, node.id, seed, true);
            
            pendingEdits.set(node.id, {
                sessionId,
                originalText: text,
                seed
            });
        } else {
            console.log(`[交互式文本暂停] 节点 ${node.id} 没有可预处理的文本`);
        }
    } catch (error) {
        console.error("[交互式文本暂停] 预处理节点时出错:", error);
    }
}

function showTextEditor(sessionId, initialText, nodeId, seed = 0, isPreExecution = false) {
    if (currentEditSession) {
        closeTextEditor();
    }
    
    currentEditSession = sessionId;
    
    editOverlay = document.createElement('div');
    editOverlay.className = 'interactive-text-overlay';
    editOverlay.innerHTML = `
        <div class="interactive-text-modal">
            <div class="interactive-text-header">
                <h3>📝 交互式文本编辑器 ${isPreExecution ? '(预编辑模式)' : ''}</h3>
                <p>${isPreExecution ? '队列执行前预编辑 - 修改文本后将直接用于工作流执行' : '修改文本后点击"确认"继续ComfyUI工作流程'}</p>
            </div>
            
            <div class="interactive-text-content">
                <textarea 
                    id="interactive-text-input" 
                    class="interactive-text-textarea"
                    placeholder="在此编辑您的文本..."
                >${initialText}</textarea>
            </div>
            
            <div class="interactive-text-actions">
                <button id="interactive-text-confirm" class="interactive-text-btn confirm">
                    ✅ 确认修改
                </button>
                <button id="interactive-text-cancel" class="interactive-text-btn cancel">
                    ❌ 取消
                </button>
                <button id="interactive-text-reset" class="interactive-text-btn reset">
                    🔄 重置
                </button>
            </div>
            
            <div class="interactive-text-footer">
                <span id="interactive-text-status">
                    字符数: ${initialText.length} | 种子: ${seed} | 会话ID: ${sessionId.slice(0, 8)}...
                </span>
            </div>
        </div>
    `;
    
    document.body.appendChild(editOverlay);
    
    const textarea = document.getElementById('interactive-text-input');
    const confirmBtn = document.getElementById('interactive-text-confirm');
    const cancelBtn = document.getElementById('interactive-text-cancel');
    const resetBtn = document.getElementById('interactive-text-reset');
    const statusSpan = document.getElementById('interactive-text-status');
    
    textarea.focus();
    textarea.select();
    
    function updateStatus() {
        const text = textarea.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        statusSpan.textContent = `字符数: ${charCount} | 行数: ${lineCount} | 种子: ${seed} | 会话ID: ${sessionId.slice(0, 8)}...`;
    }
    
    textarea.addEventListener('input', updateStatus);
    
    confirmBtn.addEventListener('click', () => {
        confirmTextEdit(sessionId, textarea.value, isPreExecution, nodeId);
    });
    
    cancelBtn.addEventListener('click', () => {
        confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
    });
    
    resetBtn.addEventListener('click', () => {
        textarea.value = initialText;
        updateStatus();
        textarea.focus();
    });
    
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            confirmTextEdit(sessionId, textarea.value, isPreExecution, nodeId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
        }
    });
    
    editOverlay.addEventListener('click', (e) => {
        if (e.target === editOverlay) {
            confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
        }
    });
    
    updateStatus();
}

async function confirmTextEdit(sessionId, editedText, isPreExecution = false, nodeId = null) {
    try {
        if (isPreExecution) {
            console.log(`[交互式文本暂停] 预编辑完成，节点ID: ${nodeId}`);
            console.log(`[交互式文本暂停] 编辑后文本长度: ${editedText.length}`);
            
            const editData = pendingEdits.get(nodeId);
            if (editData) {
                const preEditResponse = await fetch('/interactive_text/pre_edit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        node_id: nodeId,
                        original_text: editData.originalText,
                        seed: editData.seed,
                        edited_text: editedText
                    })
                });
                
                if (preEditResponse.ok) {
                    console.log("[交互式文本暂停] 预编辑结果已发送到后端");
                } else {
                    console.error("[交互式文本暂停] 预编辑结果发送失败:", preEditResponse.status);
                }
            }
            
            closeTextEditor();
            
            console.log("[交互式文本暂停] 预编辑完成，等待工作流执行");
            return;
        }
        
        const response = await fetch('/interactive_text/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                text: editedText,
                is_pre_execution: false
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("[交互式文本暂停] 编辑确认成功:", result);
            
            closeTextEditor();
            
            console.log("[交互式文本暂停] 文本编辑已提交，工作流将继续执行");
            
        } else {
            console.error("[交互式文本暂停] 编辑确认失败:", response.status);
            alert("编辑确认失败，请重试");
        }
        
    } catch (error) {
        console.error("[交互式文本暂停] 网络错误:", error);
        alert("网络错误，请重试");
    }
}

function closeTextEditor() {
    if (editOverlay) {
        document.body.removeChild(editOverlay);
        editOverlay = null;
    }
    currentEditSession = null;
}

window.addEventListener('beforeunload', () => {
    closeTextEditor();
}); 