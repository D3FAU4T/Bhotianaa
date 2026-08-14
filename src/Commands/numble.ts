import type { Command } from "../Typings/Bhotianaa";
import { findMathExpression } from '../Core/Functions';

export default <Command> {
    name: "numble",
    description: "Find a mathematical expression for provided numbers and a target",
    aliases: null,
    roles: ["broadcaster", "lead_moderator", "moderator", "vip", "subscriber", "viewer"],
    execute: async (notification, client, _sharedContext) => {
        // Strip command prefix (e.g. "!numble")
        const rawContent = notification.event.message.text.replace(/^!\S+\s*/, '').trim();

        if (!rawContent) {
            return await client.reply(
                notification.event.message_id,
                "Usage: !numble <target>; <num1> <num2> <num3>... (or !numble <target> <num1> <num2> <num3>...)"
            );
        }

        let target: number;
        let numberStrings: string[] = [];

        if (rawContent.includes(';')) {
            const [goalStr, numsStr] = rawContent.split(';');
            target = parseFloat(goalStr?.trim() ?? '');
            if (numsStr) {
                numberStrings = numsStr.trim().split(/[\s,]+/).filter(Boolean);
            }
        } else {
            const tokens = rawContent.split(/[\s,]+/).filter(Boolean);
            target = parseFloat(tokens[0] ?? '');
            numberStrings = tokens.slice(1);
        }

        if (isNaN(target)) {
            return await client.reply(
                notification.event.message_id,
                "❌ Invalid target number. Please provide a valid number. Usage: !numble <target>; <num1> <num2>..."
            );
        }

        const numbers: number[] = [];
        for (const numStr of numberStrings) {
            const num = parseFloat(numStr);
            if (isNaN(num)) {
                return await client.reply(
                    notification.event.message_id,
                    `❌ Invalid number: "${numStr}". Please provide valid numbers.`
                );
            }
            numbers.push(num);
        }

        if (numbers.length < 2) {
            return await client.reply(
                notification.event.message_id,
                "❌ Please provide at least 2 numbers to work with."
            );
        }

        try {
            await client.say("Computing...");
            const initialExprs: readonly string[] = numbers.map(n => n.toString());
            const solution = findMathExpression(numbers, initialExprs, target);

            if (solution)
                await client.reply(
                    notification.event.message_id,
                    `🎉 Found it: ${solution} = ${target}`
                );
            
            else
                await client.reply(
                    notification.event.message_id,
                    `😕 No solution found`
                );
        }
        
        catch (error) {
            console.error('Math solver error:', error);
            await client.reply(
                notification.event.message_id,
                "❌ An error occurred while solving. Please try again."
            );
        }
    }
}