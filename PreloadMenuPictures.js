//=============================================================================
// PreloadMenuPictures.js
//=============================================================================
/*:
 * @plugindesc 游戏启动时预加载指定图片（默认预加载图片菜单用到的 0~4），避免菜单首次打开时闪烁。
 * @author 清寒不知雨
 *
 * @param Picture List
 * @desc 需要预加载的图片文件名（不含扩展名，逗号分隔）。留空则使用默认 0,1,2,3,4
 * @default 0,1,2,3,4
 * @type string
 *
 * @param Debug Log
 * @desc 是否输出预加载信息到控制台
 * @default false
 * @type boolean
 *
 * @help
 * 本插件在 Scene_Boot（游戏启动时）预加载 img/pictures 下的指定图片，
 * 让图片菜单等需要即时显示的图片不会在第一次出现时卡顿/闪烁。
 *
 * - Picture List：填写图片文件名（与 img/pictures 下的文件名一致，不含扩展名），逗号分隔。
 * - 与 PictureMenuMouse 的 “Menu Pictures” 保持一致即可。
 */
(function () {
    'use strict';

    var parameters = PluginManager.parameters('PreloadMenuPictures');
    var listStr = String(parameters['Picture List'] || '0,1,2,3,4');
    var debugLog = parameters['Debug Log'] === 'true' || parameters['Debug Log'] === true;

    var pictureList = listStr.split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });

    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        pictureList.forEach(function (picName) {
            ImageManager.loadPicture(picName);
            if (debugLog && console) console.log('[PreloadMenuPictures] 预加载图片: ' + picName);
        });
    };

    // 确保显示图片时优先使用已缓存的位图（与原版行为一致）
    var _Sprite_Picture_loadBitmap = Sprite_Picture.prototype.loadBitmap;
    Sprite_Picture.prototype.loadBitmap = function () {
        var picture = this.picture();
        if (picture) {
            this.bitmap = ImageManager.loadPicture(picture.name());
        } else {
            this.bitmap = null;
        }
    };
})();
