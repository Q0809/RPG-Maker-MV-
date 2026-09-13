//=============================================================================
// PictureMenuMouse.js
//=============================================================================
/*:
 * @plugindesc 图片式自定义菜单（ESC 开关，鼠标点击 + 键盘选择，显示时禁用移动与原版菜单）。
 * @author 清寒不知雨
 *
 * @param Menu Switch ID
 * @desc 控制菜单显示/隐藏的开关ID（需与 LoadGameFix 保持一致）
 * @default 1
 * @type number
 *
 * @param Menu Pictures
 * @desc 菜单图片文件名（不含扩展名，逗号分隔，按从上到下对应 0~4 项）
 * @default 0,1,2,3,4
 * @type string
 *
 * @param Function Areas
 * @desc 各菜单项点击区域：x,y,宽,高；多项用分号分隔（与菜单项一一对应）
 * @default 408,418,200,25;408,448,200,25;408,472,200,25;408,499,200,25;408,526,200,25
 * @type string
 *
 * @param Default Picture Index
 * @desc 打开菜单时默认高亮的图片索引（0-4）
 * @default 0
 * @type number
 *
 * @param Debug Log
 * @desc 是否输出调试信息到控制台
 * @default false
 * @type boolean
 *
 * @help
 * === 使用说明 ===
 * 1. 按 ESC 打开/关闭菜单；菜单中可用“上/下”键切换，回车/空格确认。
 * 2. 也可用鼠标点击对应区域（Function Areas 定义的位置）选择。
 * 3. 菜单显示时玩家无法移动，原版菜单被禁用。
 * 4. 菜单图片（Menu Pictures）需放在项目的 img/pictures 文件夹中。
 * 5. 五项功能固定为：退出游戏 / 物品 / 存档 / 读档 / 返回标题。
 * 6. 插件指令：
 *    ShowMenu            打开菜单
 *    HideMenu            关闭菜单
 *    SetMenuSelection n  设置当前选中项（n 为 0~4）
 * 7. Menu Switch ID 必须与 LoadGameFix 插件中的“Menu Switch ID”相同。
 *
 * === 加载顺序建议 ===
 * WASDMovement → PreloadMenuPictures → LoadGameFix → PictureMenuMouse
 */
(function () {
    'use strict';

    var parameters = PluginManager.parameters('PictureMenuMouse');
    var menuSwitchId = Number(parameters['Menu Switch ID'] || 1);
    var menuPictures = String(parameters['Menu Pictures'] || '0,1,2,3,4')
        .split(',').map(function (s) { return s.trim(); });
    var functionAreas = String(parameters['Function Areas'] ||
        '408,418,200,25;408,448,200,25;408,472,200,25;408,499,200,25;408,526,200,25').split(';');
    var defaultPictureIndex = Number(parameters['Default Picture Index'] || 0);
    var debugLog = parameters['Debug Log'] === 'true' || parameters['Debug Log'] === true;

    function log() {
        if (debugLog && console) {
            console.log.apply(console, ['[PictureMenuMouse]'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    // 菜单功能（固定 5 项，顺序与图片/区域一一对应）
    var menuFunctions = [
        { name: '退出游戏', handler: exitGame },
        { name: '物品', handler: openItems },
        { name: '存档', handler: openSave },
        { name: '读档', handler: openLoad },
        { name: '返回标题', handler: returnToTitle }
    ];

    var _currentSelection = defaultPictureIndex;
    var _menuScene = null;         // 当前承载菜单的场景
    var _menuContainer = null;
    var _backgroundSprite = null;
    var _menuSprites = [];
    var _openAfterReturn = false;  // 从 物品/存档/读档 子场景返回后，菜单是否应保持打开

    var _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    var _Scene_Map_update = Scene_Map.prototype.update;
    var _Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    var _Game_Player_canMove = Game_Player.prototype.canMove;

    // 禁用原版菜单
    Scene_Map.prototype.isMenuEnabled = function () { return false; };

    // 菜单显示时禁止玩家移动
    Game_Player.prototype.canMove = function () {
        if (menuSwitchId > 0 && $gameSwitches.value(menuSwitchId)) return false;
        return _Game_Player_canMove.call(this);
    };

    function exitGame() { SceneManager.pop(); }
    function openItems() { pushFromMenu(Scene_Item); }
    function openSave() { pushFromMenu(Scene_Save); }
    function openLoad() { pushFromMenu(Scene_Load); }
    function returnToTitle() { SceneManager.goto(Scene_Title); }

    function pushFromMenu(sceneClass) {
        // 记录当前菜单正打开，子场景（物品/存档/读档）返回后应恢复菜单
        _openAfterReturn = (menuSwitchId > 0 && $gameSwitches.value(menuSwitchId));
        SceneManager.push(sceneClass);
    }

    function parsePosition(positionString) {
        var values = String(positionString).split(',');
        if (values.length >= 4) {
            return {
                x: Number(values[0]),
                y: Number(values[1]),
                width: Number(values[2]),
                height: Number(values[3])
            };
        }
        return null;
    }

    function createMenuContainer(scene) {
        _menuContainer = new Sprite();
        scene.addChild(_menuContainer);
        return _menuContainer;
    }

    function createBackgroundSprite(scene) {
        _backgroundSprite = new Sprite();
        var name = menuPictures[_currentSelection] || '';
        _backgroundSprite.bitmap = ImageManager.loadPicture(name);
        _backgroundSprite.x = 0;
        _backgroundSprite.y = 0;
        _backgroundSprite.visible = false;
        scene.addChild(_backgroundSprite);
        log('创建背景图片:', name);
        return _backgroundSprite;
    }

    // 把菜单相关精灵重新提到场景最顶层（防止被 Spriteset_Map / 窗口层遮挡）
    function bringToTop() {
        var scene = _menuScene;
        if (!scene) return;
        if (_backgroundSprite && _backgroundSprite.parent === scene) {
            scene.removeChild(_backgroundSprite);
            scene.addChild(_backgroundSprite);
        }
        if (_menuContainer && _menuContainer.parent === scene) {
            scene.removeChild(_menuContainer);
            scene.addChild(_menuContainer);
        }
    }

    function createMenuSprites(scene) {
        _menuScene = scene;
        _menuContainer = createMenuContainer(scene);
        createBackgroundSprite(scene);
        _menuSprites = [];

        for (var i = 0; i < functionAreas.length; i++) {
            var position = parsePosition(functionAreas[i]);
            if (!position) continue;
            var sprite = new Sprite();
            sprite.bitmap = new Bitmap(position.width, position.height);
            sprite.x = position.x;
            sprite.y = position.y;
            sprite.width = position.width;
            sprite.height = position.height;
            sprite.visible = false; // 仅用于点击检测，不显示
            sprite._menuIndex = i;
            _menuContainer.addChild(sprite);
            _menuSprites.push(sprite);
            log('创建功能区域:', i, position.x, position.y);
        }

        bringToTop();
    }

    function toggleMenu(visible) {
        if (menuSwitchId > 0) $gameSwitches.setValue(menuSwitchId, visible);
        if (visible) bringToTop(); // 打开时确保在最上层
        if (_menuContainer) _menuContainer.visible = visible;
        if (_backgroundSprite) {
            _backgroundSprite.visible = visible;
            if (visible) updateMenuDisplay();
        }
        if (visible && $gamePlayer) $gamePlayer.straighten();
        log('菜单状态:', visible ? '显示' : '隐藏');
    }

    function handleMouseClick(x, y) {
        for (var i = 0; i < _menuSprites.length; i++) {
            var sprite = _menuSprites[i];
            if (x >= sprite.x && x <= sprite.x + sprite.width &&
                y >= sprite.y && y <= sprite.y + sprite.height) {
                SoundManager.playOk();
                _currentSelection = sprite._menuIndex;
                updateMenuDisplay();
                executeSelectedFunction();
                return true;
            }
        }
        return false;
    }

    function handleKeyboardInput() {
        if (Input.isRepeated('up')) {
            _currentSelection = (_currentSelection - 1 + menuFunctions.length) % menuFunctions.length;
            SoundManager.playCursor();
            updateMenuDisplay();
            return true;
        } else if (Input.isRepeated('down')) {
            _currentSelection = (_currentSelection + 1) % menuFunctions.length;
            SoundManager.playCursor();
            updateMenuDisplay();
            return true;
        } else if (Input.isTriggered('ok')) {
            SoundManager.playOk();
            executeSelectedFunction();
            return true;
        }
        return false;
    }

    function updateMenuDisplay() {
        if (_backgroundSprite && _backgroundSprite.visible) {
            var name = menuPictures[_currentSelection] || '';
            _backgroundSprite.bitmap = ImageManager.loadPicture(name);
            log('更新菜单显示，选择:', _currentSelection);
        }
    }

    function executeSelectedFunction() {
        if (_currentSelection >= 0 && _currentSelection < menuFunctions.length) {
            var func = menuFunctions[_currentSelection].handler;
            if (func) {
                // 物品/存档/读档保持菜单打开（这些场景自行处理返回）
                if (_currentSelection !== 1 && _currentSelection !== 2 && _currentSelection !== 3) {
                    toggleMenu(false);
                }
                func();
            }
        }
    }

    // 关键：本工程里 Spriteset_Map / 窗口是在 onMapLoaded → createDisplayObjects 中
    // 异步创建的，所以菜单精灵必须在这之后创建，才能保证显示在最上层。
    Scene_Map.prototype.createDisplayObjects = function () {
        _Scene_Map_createDisplayObjects.call(this);
        createMenuSprites(this);
        toggleMenu(menuSwitchId > 0 && $gameSwitches.value(menuSwitchId));
    };

    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);

        // 从 物品/存档/读档 子场景（SceneManager.push）返回时，SceneManager 会创建全新的
        // Scene_Map 并再次 start()；LoadGameFix 的 start 钩子会把菜单开关关掉，但菜单图片
        // 仍可见 —— 造成“图片在但输入控制人物”的错位（需再按一次 ESC）。
        // 这里在 update 首帧重新断言菜单状态，保证开关与图片一致，且不依赖插件加载顺序。
        if (_openAfterReturn) {
            _openAfterReturn = false;
            if (menuSwitchId > 0) $gameSwitches.setValue(menuSwitchId, true);
            _currentSelection = defaultPictureIndex;
            toggleMenu(true);
            log('从子场景返回，恢复自定义菜单');
        }

        // ESC 键切换菜单
        if (Input.isTriggered('escape')) {
            var isMenuVisible = !(menuSwitchId > 0 && $gameSwitches.value(menuSwitchId));
            toggleMenu(isMenuVisible);
            if (isMenuVisible) {
                SoundManager.playOk();
                _currentSelection = defaultPictureIndex;
                updateMenuDisplay();
            } else {
                SoundManager.playCancel();
            }
        }

        // 菜单显示时的输入处理
        if (menuSwitchId > 0 && $gameSwitches.value(menuSwitchId)) {
            if (TouchInput.isTriggered()) {
                handleMouseClick(TouchInput.x, TouchInput.y);
            }
            handleKeyboardInput();
            if ($gamePlayer) $gamePlayer.straighten();
        }
    };

    // 读档后关闭菜单（真正读档成功时，菜单应回到干净的关闭状态）
    Scene_Load.prototype.onLoadSuccess = function () {
        _Scene_Load_onLoadSuccess.call(this);
        _openAfterReturn = false;
        toggleMenu(false);
    };

    // 插件指令支持
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'ShowMenu') {
            toggleMenu(true);
            _currentSelection = defaultPictureIndex;
            updateMenuDisplay();
        } else if (command === 'HideMenu') {
            toggleMenu(false);
        } else if (command === 'SetMenuSelection' && args.length > 0) {
            var index = parseInt(args[0], 10);
            if (!isNaN(index) && index >= 0 && index < menuFunctions.length) {
                _currentSelection = index;
                updateMenuDisplay();
            }
        }
    };
})();
