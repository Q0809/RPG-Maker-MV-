//=============================================================================
// WASDMovement.js
//=============================================================================
/*:
 * @plugindesc 让 WASD（及其他自定义按键）拥有方向键的全部功能，同时保留方向键。
 * @author 清寒不知雨
 *
 * @param Up Key Code
 * @desc 映射为“上”的按键 KeyCode（默认 87 = W）。可填多个，逗号分隔。
 * @default 87
 * @type string
 *
 * @param Down Key Code
 * @desc 映射为“下”的按键 KeyCode（默认 83 = S）
 * @default 83
 * @type string
 *
 * @param Left Key Code
 * @desc 映射为“左”的按键 KeyCode（默认 65 = A）
 * @default 65
 * @type string
 *
 * @param Right Key Code
 * @desc 映射为“右”的按键 KeyCode（默认 68 = D）
 * @default 68
 * @type string
 *
 * @help
 * 本插件仅把指定按键绑定到方向键功能（扩充 Input.keyMapper），
 * 因此移动、菜单、确认等所有依赖方向键的操作都会自动支持这些按键，且不会与原版冲突。
 *
 * 常用 KeyCode：W=87  A=65  S=83  D=68（小键盘方向键 104/98/100/102 也可填入）。
 * 方向键本身默认已可用，本插件不改动它们。
 *
 * 例：想让“IJKL”也控制移动，可把
 *   Up Key Code 设为 73，Down 设为 74，Left 设为 75，Right 设为 76。
 */
(function () {
    'use strict';

    var parameters = PluginManager.parameters('WASDMovement');

    // 默认键位（与 @param 默认值一致）。即便 plugins.js 未写入参数，也能开箱即用。
    var DEFAULTS = {
        'Up Key Code': '87',
        'Down Key Code': '83',
        'Left Key Code': '65',
        'Right Key Code': '68'
    };

    function codes(key) {
        var raw = (parameters && parameters[key] != null) ? parameters[key] : DEFAULTS[key];
        return String(raw || '').split(',').map(function (s) {
            return parseInt(s.trim(), 10);
        }).filter(function (n) { return !isNaN(n); });
    }

    var upCodes = codes('Up Key Code');
    var downCodes = codes('Down Key Code');
    var leftCodes = codes('Left Key Code');
    var rightCodes = codes('Right Key Code');

    function applyMapping() {
        if (!Input || !Input.keyMapper) return;
        upCodes.forEach(function (c) { Input.keyMapper[c] = 'up'; });
        downCodes.forEach(function (c) { Input.keyMapper[c] = 'down'; });
        leftCodes.forEach(function (c) { Input.keyMapper[c] = 'left'; });
        rightCodes.forEach(function (c) { Input.keyMapper[c] = 'right'; });
    }

    // 兜底：插件加载时 Input 通常已初始化，立即应用一次
    applyMapping();

    // 安全网：若引擎在之后重新初始化输入，启动时再应用一次
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        applyMapping();
    };
})();
