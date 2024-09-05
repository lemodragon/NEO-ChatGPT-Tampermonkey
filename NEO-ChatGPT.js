// ==UserScript==
// @name NEO-ChatGPT
// @version 1.4.0
// @description 将refresh Token转access token，并管理refresh tokens，支持主题变化，集成自动登录功能
// @author feifa
// @match https://new.oaifree.com/*
// @icon  https://demo-cloudflare-imgbed.pages.dev/file/cee2372da4bf91e7b2cdf.png
// @grant GM_xmlhttpRequest
// @grant GM_setValue
// @grant GM_getValue
// @connect token.oaifree.com
// @connect chat.oaifree.com
// @license GNU GPLv3
// ==/UserScript==

(function() {
    // 默认的refreshTokens
    let defaultTokens = [
        '0btonK361Tk9C9-ByJvNjtPcMBGCASJ9FtTGeZo8-4_OI',
        '20OzALNkhHjONZ56YHqAcqBfHZT_mKm9YAh4EGE6LqnCE',
        '84a7Ss2jBK40nN0_jPr1BmxuvxnHNUkvNrVsl6laeYIjN'
        // ... 其他tokens
    ];

    // 从localStorage中读取refreshTokens
    let storedTokens = JSON.parse(localStorage.getItem('refreshTokens')) || [];

    let refreshTokens = []; // 这将在mergeAndDeduplicateTokens函数中被填充

    // 合并并去重tokens
    function mergeAndDeduplicateTokens() {
        console.log('合并并去重 tokens');
        refreshTokens = [...new Set([...defaultTokens, ...storedTokens])];
        saveRefreshTokens();
        updateTokenSelect();
    }

    // 保存refreshTokens到localStorage
    function saveRefreshTokens() {
        localStorage.setItem('refreshTokens', JSON.stringify(refreshTokens));
    }

    // 获取token的显示文本
    function getTokenDisplayText(token, index) {
        if (defaultTokens.includes(token)) {
            return `Token ${index + 1} (默认)`;
        } else {
            return `Token ${index + 1}`;
        }
    }

    // 添加新的token
    function addToken(token) {
        if (!refreshTokens.includes(token)) {
            storedTokens.push(token);
            mergeAndDeduplicateTokens();
            showToast('Token 添加成功', 'success');
        } else {
            showToast('Token 已存在', 'warning');
        }
    }

    // 删除token
    function removeToken(index) {
        if (index >= 0 && index < refreshTokens.length) {
            const token = refreshTokens[index];
            if (!defaultTokens.includes(token)) {
                storedTokens = storedTokens.filter(t => t !== token);
                mergeAndDeduplicateTokens();
                showToast('Token 删除成功', 'success');
            } else {
                showToast('默认 Token 不能删除', 'error');
            }
        }
    }

    let currentTokenIndex = 0;
    let currentAccessToken = null;
    let currentShareToken = null;
    let isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 全局定义container变量
    let container;
    let tokenSelect;
    let refreshButton;
    let copyButton;
    let loginButton;
    let toggleButton;
    let statusDisplay;
    let manageTokensButton;

    function createAndAddUIElements() {
        // 创建下拉选项框、按钮和显示区
        tokenSelect = document.createElement('select');
        tokenSelect.style.marginRight = '10px';
        tokenSelect.style.width = '200px';
        tokenSelect.style.fontSize = '18px';
        tokenSelect.style.borderRadius = '5px';
        tokenSelect.style.padding = '5px';
        tokenSelect.style.transition = 'all 0.3s ease';

        refreshButton = createButton('刷新');
        copyButton = createButton('复制Access Token');
        loginButton = createButton('登录');
        manageTokensButton = createButton('管理Tokens');

        copyButton.disabled = true;
        loginButton.disabled = true;

        statusDisplay = document.createElement('div');
        statusDisplay.style.marginTop = '10px';
        statusDisplay.style.wordBreak = 'break-all';
        statusDisplay.style.padding = '10px';
        statusDisplay.style.borderRadius = '5px';
        statusDisplay.style.transition = 'all 0.3s ease';

        toggleButton = createButton('隐藏');
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '60px';
        toggleButton.style.right = '20px';
        toggleButton.style.zIndex = '9998';

        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '40px';
        container.style.right = '100px';
        container.style.zIndex = '9999';
        container.style.padding = '20px';
        container.style.borderRadius = '10px';
        container.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        container.style.display = 'none'; // 初始状态隐藏
        container.style.transition = 'all 0.3s ease';

        container.appendChild(tokenSelect);
        container.appendChild(refreshButton);
        container.appendChild(copyButton);
        container.appendChild(loginButton);
        container.appendChild(manageTokensButton);
        container.appendChild(statusDisplay);
        document.body.appendChild(container);
        document.body.appendChild(toggleButton);

        // 添加事件监听器
        toggleButton.addEventListener('click', function() {
            console.log('切换按钮点击');
            if (container.style.display === 'none') {
                container.style.display = 'block';
                toggleButton.innerText = '隐藏';
            } else {
                container.style.display = 'none';
                toggleButton.innerText = '显示';
            }
        });

        refreshButton.addEventListener('click', async function() {
            console.log('刷新按钮点击');
            let index = parseInt(tokenSelect.value);
            if (index >= 0 && index < refreshTokens.length) {
                currentTokenIndex = index;
                updateStatus('正在转化...', 'info');
                try {
                    currentAccessToken = await getAccessToken(refreshTokens[currentTokenIndex]);
                    if (currentAccessToken) {
                        updateStatus(`Refresh Token ${currentTokenIndex + 1} 转化成功`, 'success');
                        copyButton.disabled = false;
                        loginButton.disabled = false;
                        
                        // 获取ShareToken
                        currentShareToken = await getShareToken(currentAccessToken);
                        if (currentShareToken) {
                            updateStatus('登录按钮已启用，点击可进行登录', 'success');
                        } else {
                            updateStatus('获取ShareToken失败', 'error');
                            loginButton.disabled = true;
                        }
                    } else {
                        updateStatus('转化失败，请重试', 'error');
                        copyButton.disabled = true;
                        loginButton.disabled = true;
                    }
                } catch (err) {
                    updateStatus('转化失败，请重试', 'error');
                    console.error('Error fetching tokens:', err);
                    copyButton.disabled = true;
                    loginButton.disabled = true;
                }
            } else {
                updateStatus('选择的序列号无效', 'error');
            }
        });

        copyButton.addEventListener('click', function() {
            console.log('复制按钮点击');
            if (currentAccessToken) {
                navigator.clipboard.writeText(currentAccessToken).then(() => {
                    showToast('Access Token 已复制到剪贴板', 'success');
                }).catch(err => {
                    showToast('复制失败，请手动复制', 'error');
                    console.error('Error copying access token:', err);
                });
            }
        });

        loginButton.addEventListener('click', function() {
            console.log('登录按钮点击');
            if (currentShareToken) {
                autoLogin(currentShareToken);
            } else {
                showToast('无效的ShareToken，请先刷新', 'error');
            }
        });

        manageTokensButton.addEventListener('click', function() {
            console.log('管理 Tokens 按钮点击');
            openManageTokensModal();
        });

        // 初始更新主题
        updateTheme();
    }

    // 在页面加载完成后执行createAndAddUIElements函数
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createAndAddUIElements);
    } else {
        createAndAddUIElements();
    }

    // 监听主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        console.log('主题变化监听');
        isDarkMode = event.matches;
        updateTheme();
    });

    // 初始化tokens
    mergeAndDeduplicateTokens();

    function updateTokenSelect() {
        console.log('更新下拉选项框');
        tokenSelect.innerHTML = '';
        refreshTokens.forEach((token, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.text = getTokenDisplayText(token, index);
            tokenSelect.appendChild(option);
        });
    }

    function openManageTokensModal() {
        console.log('打开管理 Tokens 模态框');
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';

        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = isDarkMode ? '#333' : 'white';
        modalContent.style.color = isDarkMode ? 'white' : 'black';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '10px';
        modalContent.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        modalContent.style.width = '80%';
        modalContent.style.maxWidth = '400px';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflowY = 'auto';

        const tokensList = document.createElement('ul');
        tokensList.style.listStyleType = 'none';
        tokensList.style.padding = '0';

        function updateTokensList() {
            console.log('更新 Tokens 列表');
            tokensList.innerHTML = '';
            refreshTokens.forEach((token, index) => {
                const listItem = document.createElement('li');
                listItem.style.display = 'flex';
                listItem.style.justifyContent = 'space-between';
                listItem.style.alignItems = 'center';
                listItem.style.marginBottom = '10px';
                listItem.style.padding = '10px';
                listItem.style.borderRadius = '5px';
                listItem.style.backgroundColor = isDarkMode ? '#444' : '#f0f0f0';

                const tokenText = document.createElement('span');
                tokenText.innerText = getTokenDisplayText(token, index);
                tokenText.style.wordBreak = 'break-all';
                tokenText.style.marginRight = '10px';

                const deleteButton = createButton('删除', 'small');
                if (defaultTokens.includes(token)) {
                    deleteButton.disabled = true;
                    deleteButton.title = '默认token不能删除';
                } else {
                    deleteButton.addEventListener('click', () => {
                        console.log('删除按钮点击');
                        if (confirm('确定要删除这个 Token 吗？')) {
                            removeToken(index);
                            updateTokensList();
                            updateTokenSelect();
                        }
                    });
                }

                listItem.appendChild(tokenText);
                listItem.appendChild(deleteButton);
                tokensList.appendChild(listItem);
            });
        }

        updateTokensList();

        const addTokenInput = document.createElement('input');
        addTokenInput.type = 'text';
        addTokenInput.placeholder = '输入新的refresh token';
        addTokenInput.style.width = '100%';
        addTokenInput.style.fontSize = '16px';
        addTokenInput.style.padding = '10px';
        addTokenInput.style.borderRadius = '5px';
        addTokenInput.style.marginBottom = '10px';
        addTokenInput.style.border = '1px solid ' + (isDarkMode ? '#555' : '#ccc');
        addTokenInput.style.backgroundColor = isDarkMode ? '#444' : 'white';
        addTokenInput.style.color = isDarkMode ? 'white' : 'black';

        const addTokenButton = createButton('添加');
        addTokenButton.style.width = '100%';
        addTokenButton.addEventListener('click', () => {
            console.log('添加按钮点击');
            if (addTokenInput.value) {
                addToken(addTokenInput.value);
                updateTokensList();
                updateTokenSelect();
                addTokenInput.value = '';
            } else {
                showToast('请输入有效的 Token', 'warning');
            }
        });

        const closeButton = createButton('关闭');
        closeButton.style.width = '100%';
        closeButton.style.marginTop = '10px';
        closeButton.addEventListener('click', () => {
            console.log('关闭按钮点击');
            document.body.removeChild(modal);
        });

        modalContent.appendChild(tokensList);
        modalContent.appendChild(addTokenInput);
        modalContent.appendChild(addTokenButton);
        modalContent.appendChild(closeButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    function getAccessToken(refreshToken) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://token.oaifree.com/api/auth/refresh',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: `refresh_token=${refreshToken}`,
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        if(data.access_token){
                            resolve(data.access_token);
                        } else {
                            reject('Failed to generate access token, response: ' + data);
                        }
                    } else {
                        reject('Failed to refresh access token');
                    }
                },
                onerror: function(e) {
                    console.error(e);
                    reject('Failed to refresh access token');
                }
            });
        });
    }

    function getShareToken(accessToken) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://chat.oaifree.com/token/register',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                data: `unique_name=${generateRandomHex(8)}&access_token=${accessToken}&expires_in=0&site_limit=&gpt35_limit=-1&gpt4_limit=-1&show_conversations=true`,
                onload: function(response) {
                    if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        GM_setValue('expire_at', data.expire_at);
                        if(data.token_key){
                            resolve(data.token_key);
                        } else {
                            reject('Failed to generate share token, response: ' + data);
                        }
                    } else {
                        reject('Failed to generate share token');
                    }
                },
                onerror: function(e) {
                    console.error(e);
                    reject('Failed to generate share token');
                }
            });
        });
    }

    function generateRandomHex(length) {
        let result = '';
        const characters = '0123456789abcdef';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    function autoLogin(shareToken) {
        const loginUrl = `https://new.oaifree.com/auth/login_share?token=${shareToken}`;
        console.log('Logging in with URL: ' + loginUrl);
        window.location.href = loginUrl;
    }

    function updateTheme() {
        console.log('更新主题样式');
        const backgroundColor = isDarkMode ? '#333' : 'white';
        const textColor = isDarkMode ? 'white' : 'black';
        const borderColor = isDarkMode ? '#555' : '#ccc';

        container.style.backgroundColor = backgroundColor;
        container.style.color = textColor;
        tokenSelect.style.backgroundColor = backgroundColor;
        tokenSelect.style.color = textColor;
        tokenSelect.style.borderColor = borderColor;
        updateButtonStyles(refreshButton);
        updateButtonStyles(copyButton);
        updateButtonStyles(loginButton);
        updateButtonStyles(manageTokensButton);
        updateButtonStyles(toggleButton);
        statusDisplay.style.backgroundColor = isDarkMode ? '#444' : '#f0f0f0';
    }

    function createButton(text, size = 'normal') {
        const button = document.createElement('button');
        button.innerText = text;
        button.style.marginRight = '10px';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.padding = size === 'small' ? '5px 10px' : '10px 15px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.3s ease';
        updateButtonStyles(button);
        return button;
    }

    function updateButtonStyles(button) {
        button.style.backgroundColor = isDarkMode ? '#555' : '#e0e0e0';
        button.style.color = isDarkMode ? 'white' : 'black';
        button.addEventListener('mouseover', function() {
            this.style.backgroundColor = isDarkMode ? '#777' : '#d0d0d0';
        });
        button.addEventListener('mouseout', function() {
            this.style.backgroundColor = isDarkMode ? '#555' : '#e0e0e0';
        });
        button.addEventListener('mousedown', function() {
            this.style.backgroundColor = isDarkMode ? '#444' : '#c0c0c0';
        });
        button.addEventListener('mouseup', function() {
            this.style.backgroundColor = isDarkMode ? '#777' : '#d0d0d0';
        });
    }

    function updateStatus(message, type) {
        statusDisplay.innerText = message;
        statusDisplay.style.backgroundColor = getStatusColor(type);
        statusDisplay.style.color = type === 'error' ? 'white' : (isDarkMode ? 'white' : 'black');
    }

    function getStatusColor(type) {
        switch(type) {
            case 'success': return isDarkMode ? '#4caf50' : '#e8f5e9';
            case 'error': return isDarkMode ? '#f44336' : '#ffebee';
            case 'warning': return isDarkMode ? '#ff9800' : '#fff3e0';
            case 'info': return isDarkMode ? '#2196f3' : '#e3f2fd';
            default: return isDarkMode ? '#444' : '#f0f0f0';
        }
    }

    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.backgroundColor = getStatusColor(type);
        toast.style.color = type === 'error' ? 'white' : (isDarkMode ? 'white' : 'black');
        toast.style.zIndex = '10001';
        toast.style.transition = 'opacity 0.5s ease';

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 3000);
    }
})();