import { describe, it, expect } from "bun:test";
import { findMathExpression } from '../Core/Functions';


/**
 * Verifies that a mathematical expression evaluates to the expected target.
 * 
 * @param expression The mathematical expression as a string
 * @param expectedTarget The expected result
 * @returns True if the expression evaluates to the target (within epsilon tolerance)
 */
export function verifyMathExpression(expression: string, expectedTarget: number): boolean {
    try {
        const result = eval(expression);
        return typeof result === 'number' && Math.abs(result - expectedTarget) < 1e-6;
    }
    
    catch (error) {
        return false;
    }
}

function solveMathExpression(numbers: number[], target: number): string | null {
    const initialExprs: readonly string[] = numbers.map((n: number): string => n.toString());
    return findMathExpression(numbers, initialExprs, target);
}

describe("Math equation solver", () => {
    it("should find expression for 24 using classic consecutive numbers [1, 2, 3, 4]", () => {
        const numbers = [1, 2, 3, 4];
        const target = 24;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 100 using simple multiplication [25, 4]", () => {
        const numbers = [25, 4];
        const target = 100;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 42 using [6, 7] (answer to life)", () => {
        const numbers = [6, 7];
        const target = 42;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 1 using division [2, 2]", () => {
        const numbers = [2, 2];
        const target = 1;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 10 using addition chain [1, 2, 3, 4]", () => {
        const numbers = [1, 2, 3, 4];
        const target = 10;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 6 using small numbers [1, 2, 3]", () => {
        const numbers = [1, 2, 3];
        const target = 6;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 144 using perfect square [12, 12]", () => {
        const numbers = [12, 12];
        const target = 144;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 0 using zero result [5, 5]", () => {
        const numbers = [5, 5];
        const target = 0;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should find expression for 13 using complex case with 5 numbers [1, 2, 3, 4, 5]", () => {
        const numbers = [1, 2, 3, 4, 5];
        const target = 13;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeTruthy();

        if (result) {
            const isValid = verifyMathExpression(result, target);
            expect(isValid).toBe(true);
        }
    });

    it("should return null for impossible target 999 using [1, 2, 3]", () => {
        const numbers = [1, 2, 3];
        const target = 999;

        const result = solveMathExpression(numbers, target);
        expect(result).toBeNull();
    });
});
