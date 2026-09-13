//=============================================================================
// LoadGameFix.js
//=============================================================================
/*:
 * @plugindesc 读档修复插件：读档/新游戏/进地图后自动重置菜单开关、图片与变量，避免菜单状态残留。
 * @author 清寒不知雨
 *
 * @param Menu Switch ID
 * @desc 控制菜单显示状态的开关ID（需与图片菜单插件保持一致）
 * @default 1
 * @type number
 *
 * @param Reset Picture IDs
 * @desc 读档/新游戏后需要清除的图片槽位ID（逗号分隔），如 0,1,2,3,4
 * @default 0,1,2,3,4
 * @type string
 *
 * @param Reset Variable IDs
 * @desc 读档/新游戏后需要归零的变量ID（逗号分隔），如 1
 * @default 1
 * @type string
 *
 * @param Debug Log
 * @desc 是否输出调试信息到控制台
 * @default false
 * @type boolean
 *
 * @help
 * === 使用说明 ===
 * 1. 用于修复“读档后图片菜单状态异常/残留”的问题。
 * 2. 读档成功、开始新游戏、进入地图时，会自动关闭菜单开关，
 *    并清除指定的图片槽位与变量，确保菜单从干净状态开始。
 * 3. 参数说明：
 *    - Menu Switch ID：菜单开关，请与图片菜单插件设成同一个。
 *    - Reset Picture IDs：需要擦除的“显示图片”槽位（默认 0~4）。
 *    - Reset Variable IDs：需要归零的变量（默认 1，常用于菜单选中项）。
 * 4. 也可在事件中用插件指令手动重置：
 *    插件指令：ResetMenuState
 * 5. 与图片菜单插件完全兼容，无需额外公共事件。
 *
 * === 加载顺序 ===
 * 放在图片菜单插件之前（更靠上）即可。
 */
(function () {
    'use strict';

    var parameters = PluginManager.parameters('LoadGameFix');
    var menuSwitchId = Number(parameters['Menu Switch ID'] || 1);
    var resetPictures = String(parameters['Reset Picture IDs'] || '0,1,2,3,4')
        .split(',').map(function (s) { return parseInt(s.trim(), 10); })
        .filter(function (n) { return !isNaN(n); });
    var resetVariables = String(parameters['Reset Variable IDs'] || '1')
        .split(',').map(function (s) { return parseInt(s.trim(), 10); })
        .filter(function (n) { return !isNaN(n); });
    var debugLog = parameters['Debug Log'] === 'true' || parameters['Debug Log'] === true;

    function log() {
        if (debugLog && console) {
            console.log.apply(console, ['[LoadGameFix]'].concat(Array.prototype.slice.call(arguments)));
        }
    }

    function resetMenuState() {
        if (!$gameSwitches || !$gameScreen || !$gameVariables) return;

        // 关闭菜单开关
        if (menuSwitchId > 0) {
            $gameSwitches.setValue(menuSwitchId, false);
        }

        // 清除指定图片槽位
        resetPictures.forEach(function (id) {
            var pic = $gameScreen._pictures && $gameScreen._pictures[id];
            if (pic && typeof pic.erase === 'function') {
                pic.erase();
            }
        });

        // 归零指定变量
        resetVariables.forEach(function (id) {
            $gameVariables.setValue(id, 0);
        });

        log('菜单状态已重置');
    }

    var _Scene_Load_onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function () {
        _Scene_Load_onLoadSuccess.call(this);
        resetMenuState();
    };

    var _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function () {
        _DataManager_setupNewGame.call(this);
        resetMenuState();
    };

    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        if (menuSwitchId > 0 && $gameSwitches.value(menuSwitchId)) {
            $gameSwitches.setValue(menuSwitchId, false);
        }
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function (command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'ResetMenuState') {
            resetMenuState();
            log('手动重置菜单状态');
        }
    };
})();
