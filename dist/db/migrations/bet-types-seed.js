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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
import { db } from '../index';
import { betTypes } from '../schema';
var betTypesData = [
    {
        code: 'tan',
        name: '単勝',
        description: '1着になる馬を当てる',
        requiredHorses: 1,
        orderMatters: true
    },
    {
        code: 'fuku',
        name: '複勝',
        description: '3着以内に入る馬を当てる',
        requiredHorses: 1,
        orderMatters: false
    },
    {
        code: 'wakuren',
        name: '枠連',
        description: '着順を問わず、1着と2着になる枠を当てる',
        requiredHorses: 2,
        orderMatters: false
    },
    {
        code: 'umaren',
        name: '馬連',
        description: '着順を問わず、1着と2着になる馬を当てる',
        requiredHorses: 2,
        orderMatters: false
    },
    {
        code: 'wide',
        name: 'ワイド',
        description: '着順を問わず、3着以内に入る2頭を当てる',
        requiredHorses: 2,
        orderMatters: false
    },
    {
        code: 'umatan',
        name: '馬単',
        description: '1着と2着になる馬を着順通りに当てる',
        requiredHorses: 2,
        orderMatters: true
    },
    {
        code: 'sanrenpuku',
        name: '三連複',
        description: '着順を問わず、1着、2着、3着になる3頭を当てる',
        requiredHorses: 3,
        orderMatters: false
    },
    {
        code: 'sanrentan',
        name: '三連単',
        description: '1着、2着、3着になる馬を着順通りに当てる',
        requiredHorses: 3,
        orderMatters: true
    }
];
function seedBetTypes() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, betTypesData_1, betType, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    console.log('Seeding bet types...');
                    _i = 0, betTypesData_1 = betTypesData;
                    _a.label = 1;
                case 1:
                    if (!(_i < betTypesData_1.length)) return [3 /*break*/, 4];
                    betType = betTypesData_1[_i];
                    return [4 /*yield*/, db.insert(betTypes).values(betType)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('Bet types seeded successfully');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error seeding bet types:', error_1);
                    throw error_1;
                case 6: return [2 /*return*/];
            }
        });
    });
}
seedBetTypes();
