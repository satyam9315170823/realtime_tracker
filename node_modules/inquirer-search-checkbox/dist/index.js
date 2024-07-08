"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var Base = require("inquirer/lib/prompts/base");
var observe = require("inquirer/lib/utils/events");
var figures = require("figures");
var Paginator = require("inquirer/lib/utils/paginator");
var chalk_1 = require("chalk");
var fuzzy = require("fuzzy");
var ignoreKeys = ["up", "down", "space"];
function getCheckbox(checked) {
    return checked ? chalk_1.default.green(figures.radioOn) : figures.radioOff;
}
function isSeparator(c) {
    return c.type === "separator";
}
function renderChoices(choices, pointer) {
    var output = "";
    choices.forEach(function (choice, i) {
        if (choice.disabled) {
            output = output + " - " + choice.name + " (Disabled)";
        }
        else {
            var isSelected = i === pointer;
            output += isSelected ? chalk_1.default.cyan(figures.pointer) : " ";
            output += getCheckbox(choice.checked) + " " + choice.name;
        }
        output += "\n";
    });
    return output.replace(/\n$/, "");
}
var SearchBox = (function (_super) {
    __extends(SearchBox, _super);
    function SearchBox() {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        var _this = _super.apply(this, params) || this;
        _this.pointer = 0;
        _this.selection = [];
        _this.choices = [];
        _this.filterList = [];
        _this.paginator = new Paginator();
        var choices = _this.opt.choices;
        if (!choices) {
            _this.throwParamError("choices");
        }
        var item = choices.find(function (c) { return isSeparator(c); });
        if (item) {
            throw new Error("Separator is not allowed in choices.");
        }
        _this.filterList = _this.choices = choices
            .filter(function () { return true; })
            .map(function (item, id) { return (__assign({}, item, { id: id })); });
        return _this;
    }
    SearchBox.prototype.render = function (error) {
        var message = this.getQuestion();
        var bottomContent = "";
        var tip = chalk_1.default.dim("(Press <space> to select, <enter> to submit.)");
        if (this.status === "answered") {
            message += chalk_1.default.cyan(this.selection.join(", "));
        }
        else {
            message += tip + " " + this.rl.line;
            var choicesStr = renderChoices(this.filterList, this.pointer);
            bottomContent = this.paginator.paginate(choicesStr, this.pointer, this.opt.pageSize);
        }
        if (error) {
            bottomContent = chalk_1.default.red(">> ") + error;
        }
        this.screen.render(message, bottomContent);
    };
    SearchBox.prototype.filterChoices = function () {
        var options = {
            extract: function (el) { return el.name; }
        };
        this.filterList = fuzzy.filter(this.rl.line, this.choices, options).map(function (el) { return el.original; });
    };
    SearchBox.prototype.toggleChoice = function (index) {
        var item = this.filterList[index];
        if (item) {
            this.choices[item.id].checked = !item.checked;
        }
    };
    SearchBox.prototype.onSpaceKey = function () {
        this.rl.line = this.rl.line.trim();
        this.toggleChoice(this.pointer);
        this.render();
    };
    SearchBox.prototype.onDownKey = function () {
        var len = this.filterList.length;
        this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
        this.render();
    };
    SearchBox.prototype.onUpKey = function () {
        var len = this.filterList.length;
        this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
        this.render();
    };
    SearchBox.prototype.onAllKey = function () {
        var _this = this;
        var existCancel = this.filterList.find(function (item) { return !item.checked; });
        this.filterList.forEach(function (item) {
            _this.choices[item.id].checked = !!existCancel;
        });
        this.render();
    };
    SearchBox.prototype.onEnd = function (state) {
        this.status = "answered";
        this.render();
        this.screen.done();
        this.done(state.value);
    };
    SearchBox.prototype.onError = function (state) {
        this.render(state.isValid);
    };
    SearchBox.prototype.onKeyPress = function () {
        this.pointer = 0;
        this.filterChoices();
        this.render();
    };
    SearchBox.prototype.getCurrentValue = function () {
        var choices = this.choices.filter(function (item) { return item.checked && !item.disabled; });
        this.selection = choices.map(function (item) { return item.short; });
        return choices.map(function (item) { return item.value; });
    };
    SearchBox.prototype._run = function (cb) {
        this.done = cb;
        var events = observe(this.rl);
        var upKey = events.keypress.filter(function (e) {
            return e.key.name === "up" || (e.key.name === "p" && e.key.ctrl);
        });
        var downKey = events.keypress.filter(function (e) {
            return e.key.name === "down" || (e.key.name === "n" && e.key.ctrl);
        });
        var allKey = events.keypress.filter(function (e) { return e.key.name === "o" && e.key.ctrl; });
        var validation = this.handleSubmitEvents(events.line.map(this.getCurrentValue.bind(this)));
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));
        upKey.forEach(this.onUpKey.bind(this));
        downKey.forEach(this.onDownKey.bind(this));
        allKey.takeUntil(validation.success).forEach(this.onAllKey.bind(this));
        events.spaceKey
            .takeUntil(validation.success)
            .forEach(this.onSpaceKey.bind(this));
        events.keypress
            .filter(function (e) { return !e.key.ctrl && !ignoreKeys.includes(e.key.name); })
            .takeUntil(validation.success)
            .forEach(this.onKeyPress.bind(this));
        this.render();
        return this;
    };
    return SearchBox;
}(Base));
module.exports = SearchBox;
