// ==UserScript==
// @name NEO-ChatGPT
// @version 1.3.8
// @description 将refresh Token转access token，并管理refresh tokens，支持主题变化
// @author feifa
// @match https://new.oaifree.com/*
// @icon  https://demo-cloudflare-imgbed.pages.dev/file/cee2372da4bf91e7b2cdf.png
// @grant none
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
        }
    }

    // 删除token
    function removeToken(index) {
        if (index >= 0 && index < refreshTokens.length) {
            const token = refreshTokens[index];
            if (!defaultTokens.includes(token)) {
                storedTokens = storedTokens.filter(t => t !== token);
                mergeAndDeduplicateTokens();
            }
        }
    }

    // 更新默认tokens列表
    function updateDefaultTokens(newDefaultTokens) {
        defaultTokens = newDefaultTokens;
        mergeAndDeduplicateTokens();
    }

    let currentTokenIndex = 0;
    let currentAccessToken = null;
    let isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 全局定义container变量
    let container;
    let tokenSelect;
    let refreshButton;
    let copyButton;
    let toggleButton;
    let statusDisplay;
    let manageTokensButton;

    function createAndAddUIElements() {
        // 创建下拉选项框、按钮和显示区
        tokenSelect = document.createElement('select');
        tokenSelect.style.marginRight = '10px';
        tokenSelect.style.width = '200px'; // 调整下拉框宽度
        tokenSelect.style.fontSize = '18px'; // 调整提示信息文字大小
        tokenSelect.style.borderRadius = '5px';

        refreshButton = document.createElement('button');
        refreshButton.innerText = '刷新';
        refreshButton.style.marginRight = '10px';
        refreshButton.style.border = '1px solid #ccc';
        refreshButton.style.borderRadius = '5px';
        refreshButton.style.padding = '5px 10px';
        refreshButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';

        copyButton = document.createElement('button');
        copyButton.innerText = '复制Access Token';
        copyButton.style.marginRight = '10px';
        copyButton.style.border = '1px solid #ccc';
        copyButton.style.borderRadius = '5px';
        copyButton.style.padding = '5px 10px';
        copyButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        copyButton.disabled = true;

        toggleButton = document.createElement('button');
        toggleButton.innerText = '隐藏';
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '60px';
        toggleButton.style.right = '20px';
        toggleButton.style.zIndex = '9998';
        toggleButton.style.backgroundColor = 'white';
        toggleButton.style.padding = '5px';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';

        statusDisplay = document.createElement('div');
        statusDisplay.style.marginTop = '10px';
        statusDisplay.style.wordBreak = 'break-all';

        container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '40px';
        container.style.right = '100px';
        container.style.zIndex = '9999';
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        container.style.display = 'none'; // 初始状态隐藏

        // 管理tokens的UI元素
        manageTokensButton = document.createElement('button');
        manageTokensButton.innerText = '管理Tokens';
        manageTokensButton.style.marginRight = '10px';
        manageTokensButton.style.border = '1px solid #ccc';
        manageTokensButton.style.borderRadius = '5px';
        manageTokensButton.style.padding = '5px 10px';
        manageTokensButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';

        container.appendChild(tokenSelect);
        container.appendChild(refreshButton);
        container.appendChild(copyButton);
        container.appendChild(manageTokensButton);
        container.appendChild(statusDisplay);
        document.body.appendChild(container);
        document.body.appendChild(toggleButton);

        // 添加事件监听器
        toggleButton.addEventListener('click', function() {
            console.log('切换按钮点击');
            if (container.style.display === 'none') {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });

        refreshButton.addEventListener('click', function() {
            console.log('刷新按钮点击');
            let index = parseInt(tokenSelect.value);
            if (index >= 0 && index < refreshTokens.length) {
                currentTokenIndex = index;
                statusDisplay.innerText = '正在转化...';
                getAccessToken(refreshTokens[currentTokenIndex]).then(accessToken => {
                    if (accessToken) {
                        currentAccessToken = accessToken;
                        statusDisplay.innerText = `Refresh Token ${currentTokenIndex + 1} 转化成功`;
                        copyButton.disabled = false;
                    } else {
                        statusDisplay.innerText = '转化失败，请重试';
                        copyButton.disabled = true;
                    }
                }).catch(err => {
                    statusDisplay.innerText = '转化失败，请重试';
                    console.error('Error fetching access token:', err);
                    copyButton.disabled = true;
                });
            } else {
                statusDisplay.innerText = '选择的序列号无效';
            }
        });

        copyButton.addEventListener('click', function() {
            console.log('复制按钮点击');
            if (currentAccessToken) {
                navigator.clipboard.writeText(currentAccessToken).then(() => {
                    statusDisplay.innerText = 'Access Token 已复制到剪贴板';
                }).catch(err => {
                    statusDisplay.innerText = '复制失败，请手动复制';
                    console.error('Error copying access token:', err);
                });
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
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
        modalContent.style.width = '300px';

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

                const tokenText = document.createElement('span');
                tokenText.innerText = getTokenDisplayText(token, index);

                const deleteButton = document.createElement('button');
                deleteButton.innerText = '删除';
                deleteButton.style.border = '1px solid #ccc';
                deleteButton.style.borderRadius = '5px';
                deleteButton.style.padding = '5px 10px';
                deleteButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
                if (defaultTokens.includes(token)) {
                    deleteButton.disabled = true;
                    deleteButton.title = '默认token不能删除';
                } else {
                    deleteButton.addEventListener('click', () => {
                        console.log('删除按钮点击');
                        removeToken(index);
                        updateTokensList();
                        updateTokenSelect();
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
        addTokenInput.style.borderRadius = '5px';
        addTokenInput.style.marginBottom = '10px';

        const addTokenButton = document.createElement('button');
        addTokenButton.innerText = '添加';
        addTokenButton.style.border = '1px solid #ccc';
        addTokenButton.style.borderRadius = '5px';
        addTokenButton.style.padding = '5px 10px';
        addTokenButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        addTokenButton.addEventListener('click', () => {
            console.log('添加按钮点击');
            if (addTokenInput.value) {
                addToken(addTokenInput.value);
                updateTokensList();
                updateTokenSelect();
                addTokenInput.value = '';
            }
        });

        const closeButton = document.createElement('button');
        closeButton.innerText = '关闭';
        closeButton.style.border = '1px solid #ccc';
        closeButton.style.borderRadius = '5px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
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
        const url = "https://token.oaifree.com/api/auth/refresh";
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        };
        const data = new URLSearchParams({
            "refresh_token": refreshToken
        });

        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: data
        }).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then(jsonResponse => {
            return jsonResponse.access_token;
        }).catch(error => {
            console.error('Error fetching access token:', error);
            return null;
        });
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
        refreshButton.style.backgroundColor = backgroundColor;
        refreshButton.style.color = textColor;
        refreshButton.style.borderColor = borderColor;
        copyButton.style.backgroundColor = backgroundColor;
        copyButton.style.color = textColor;
        copyButton.style.borderColor = borderColor;
        manageTokensButton.style.backgroundColor = backgroundColor;
        manageTokensButton.style.color = textColor;
        manageTokensButton.style.borderColor = borderColor;
        toggleButton.style.backgroundColor = backgroundColor;
        toggleButton.style.color = textColor;
        toggleButton.style.borderColor = borderColor;
    }
})();