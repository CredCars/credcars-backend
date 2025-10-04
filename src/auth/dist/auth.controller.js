"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.AuthController = void 0;
var common_1 = require("@nestjs/common");
var dto_1 = require("../user/dto");
var dto_2 = require("./dto");
var swagger_1 = require("@nestjs/swagger");
var user_schema_1 = require("../user/schema/user.schema");
var swagger_2 = require("@nestjs/swagger");
var throttler_behind_proxy_guard_1 = require("../common/guards/throttler-behind-proxy.guard");
var jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
var refresh_token_guard_1 = require("./guards/refresh-token.guard");
var common_2 = require("@nestjs/common");
var AuthController = /** @class */ (function () {
    function AuthController(authService, responseService) {
        this.authService = authService;
        this.responseService = responseService;
        this.logger = new common_2.Logger(AuthController_1.name);
    }
    AuthController_1 = AuthController;
    AuthController.prototype.register = function (body, res) {
        return __awaiter(this, void 0, void 0, function () {
            var user, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.authService.register(body)];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, this.responseService.json(res, 201, 'User registered successfully', user)];
                    case 2:
                        error_1 = _a.sent();
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuthController.prototype.login = function (body, res) {
        return __awaiter(this, void 0, void 0, function () {
            var token, a, b, c, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.authService.login(body)];
                    case 1:
                        token = _a.sent();
                        a = 1;
                        b = 2;
                        c = a + b;
                        console.log(c);
                        return [2 /*return*/, this.responseService.json(res, 200, 'Login successful', token)];
                    case 2:
                        error_2 = _a.sent();
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuthController.prototype.logout = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.authService.logout(req.user.id)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.responseService.json(res, 200, 'Logout successful')];
                    case 2:
                        error_3 = _a.sent();
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    AuthController.prototype.refreshTokens = function (req, res) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.authService.refreshTokens(req.user.id, req.user.refreshToken)];
                    case 1:
                        tokens = _a.sent();
                        return [2 /*return*/, this.responseService.json(res, 200, 'Tokens refreshed successfully', tokens)];
                    case 2:
                        error_4 = _a.sent();
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    var AuthController_1;
    __decorate([
        common_1.Post('register'),
        swagger_1.ApiOperation({ summary: 'Register user' }),
        swagger_1.ApiBody({ type: dto_1.CreateUserDTO }),
        swagger_1.ApiResponse({
            status: 201,
            description: 'User registered successfully',
            type: user_schema_1.User
        }),
        swagger_1.ApiResponse({ status: 400, description: 'Bad Request.' }),
        swagger_1.ApiResponse({ status: 409, description: 'User already exists.' }),
        swagger_1.ApiResponse({
            status: 429,
            description: 'ThrottlerException: Too Many Requests'
        }),
        swagger_1.ApiResponse({ status: 500, description: 'Internal server error.' }),
        __param(0, common_1.Body()), __param(1, common_1.Res())
    ], AuthController.prototype, "register");
    __decorate([
        common_1.Post('login'),
        swagger_1.ApiOperation({ summary: 'Login user' }),
        swagger_1.ApiBody({ type: dto_2.LoginUserDTO }),
        swagger_1.ApiResponse({
            status: 200,
            description: 'Login successful',
            type: String
        }),
        swagger_1.ApiResponse({ status: 400, description: 'Bad Request.' }),
        swagger_1.ApiResponse({ status: 401, description: 'Invalid credentials.' }),
        swagger_1.ApiResponse({
            status: 429,
            description: 'ThrottlerException: Too Many Requests'
        }),
        swagger_1.ApiResponse({ status: 500, description: 'Internal server error.' }),
        __param(0, common_1.Body()), __param(1, common_1.Res())
    ], AuthController.prototype, "login");
    __decorate([
        common_1.Get('logout'),
        common_1.UseGuards(jwt_auth_guard_1.JwtAuthGuard),
        swagger_1.ApiOperation({ summary: 'Logout user' }),
        swagger_1.ApiResponse({ status: 200, description: 'Logout successful' }),
        swagger_1.ApiResponse({ status: 401, description: 'Unauthorized' }),
        swagger_1.ApiResponse({ status: 500, description: 'Internal server error.' }),
        __param(0, common_1.Req()), __param(1, common_1.Res())
    ], AuthController.prototype, "logout");
    __decorate([
        common_1.Get('refresh-tokens'),
        common_1.UseGuards(refresh_token_guard_1.RefreshTokenGuard),
        swagger_1.ApiOperation({ summary: 'Refresh tokens' }),
        swagger_1.ApiResponse({ status: 200, description: 'Tokens refreshed successfully' }),
        swagger_1.ApiResponse({ status: 401, description: 'Unauthorized' }),
        swagger_1.ApiResponse({ status: 500, description: 'Internal server error.' }),
        __param(0, common_1.Req()), __param(1, common_1.Res())
    ], AuthController.prototype, "refreshTokens");
    AuthController = AuthController_1 = __decorate([
        swagger_2.ApiTags('Auth'),
        common_1.Controller('auth'),
        common_1.UseGuards(throttler_behind_proxy_guard_1.AuthThrottlerGuard)
    ], AuthController);
    return AuthController;
}());
exports.AuthController = AuthController;
