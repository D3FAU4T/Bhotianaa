import type { Command } from "../Typings/Bhotianaa";
import { findMathExpression } from '../Core/Functions';

export default <Command> {
    name: "numble",
    description: "Find a mathematical expression for provided numbers and a target",
    aliases: null,
    roles: ["broadcaster", "lead_moderator", "moderator", "vip", "subscriber", "viewer"],
    execute: async (notification, client, _sharedContext) => {
        const [goalStr, numsStr] = notification.event.message.text.split(';');

        if (!goalStr || !numsStr)
            return await client.reply(
                notification.event.message_id,
                "Usage: !numble <target>; <num1> <num2> <num3>..."
            );

        // Parse target number
        const target = parseFloat(goalStr.trim());

        if (isNaN(target))
            return await client.reply(
                notification.event.message_id,
                "❌ Invalid target number. Please provide a valid number."
            );

        // Parse numbers array
        const numberStrings = numsStr.trim().split(/\s+/);
        const numbers: number[] = [];

        for (const numStr of numberStrings) {
            const num = parseFloat(numStr);

            if (isNaN(num))
                return await client.reply(
                    notification.event.message_id,
                    `❌ Invalid number: \"${numStr}\". Please provide valid numbers.`
                );
            
            numbers.push(num);
        }

        if (numbers.length < 2)
            return await client.reply(
                notification.event.message_id,
                "❌ Please provide at least 2 numbers to work with."
            );

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