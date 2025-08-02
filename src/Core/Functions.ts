/**
 * Core Functions Module
 * 
 * This module contains shared utility functions used throughout the bot.
 * Centralizing these functions helps reduce code duplication and makes
 * maintenance easier.
 */

interface Operation {
    readonly result: number;
    readonly expression: string;
}

/**
 * Finds a mathematical expression that combines given numbers to reach a target value.
 * Uses a brute-force approach trying all combinations of +, -, *, / operations.
 * 
 * @param nums Array of numbers to use in the expression
 * @param exprs Array of string expressions corresponding to the numbers
 * @param target The target value to reach
 * @returns A string expression that equals the target, or null if none found
 */
export function findMathExpression(nums: readonly number[], exprs: readonly string[], target: number): string | null {
    const Epsilon = 1e-6;

    if (nums.length === 1) {
        const firstNum = nums[0];
        const firstExpr = exprs[0];

        if (firstNum !== undefined && firstExpr !== undefined && Math.abs(firstNum - target) < Epsilon) {
            return firstExpr;
        }
        return null;
    }

    // Try every unordered pair i, j (i < j)
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            const a = nums[i];
            const b = nums[j];
            const ea = exprs[i];
            const eb = exprs[j];

            if (a === undefined || b === undefined || ea === undefined || eb === undefined)
                continue;

            // Build the list of remaining numbers/expressions
            const restNums: number[] = nums.filter((_, idx) => idx !== i && idx !== j);
            const restExprs: string[] = exprs.filter((_, idx) => idx !== i && idx !== j);

            // All 4 basic operations
            const ops: Operation[] = [
                { result: a + b, expression: `(${ea}+${eb})` },
                { result: a - b, expression: `(${ea}-${eb})` },
                { result: b - a, expression: `(${eb}-${ea})` },
                { result: a * b, expression: `(${ea}*${eb})` },
            ];

            // Division, avoid div by zero
            if (Math.abs(b) > Epsilon) {
                ops.push({ result: a / b, expression: `(${ea}/${eb})` });
            }
            if (Math.abs(a) > Epsilon) {
                ops.push({ result: b / a, expression: `(${eb}/${ea})` });
            }

            for (const { result, expression } of ops) {
                const nextNums: readonly number[] = [result, ...restNums];
                const nextExprs: readonly string[] = [expression, ...restExprs];
                const sol = findMathExpression(nextNums, nextExprs, target);
                if (sol) return sol;
            }
        }
    }
    return null;
}