import type Bhotianaa from '../Core/Client';
import type { CommandContext, ICommand } from "../Typings/Bhotianaa";
import { findMathExpression } from '../Core/Functions';

export default <ICommand> {
    name: "numble",
    description: "Find a mathematical expression for provided numbers and a target",
    moderatorOnly: true,
    execute: async (context: CommandContext, client: Bhotianaa) => {
        const [goalStr, numsStr] = context.args.join(" ").split(';');

        if (!goalStr || !numsStr)
            return await client.twitch.say("Usage: !numble <target>; <num1> <num2> <num3>...");

        // Parse target number
        const target = parseFloat(goalStr.trim());
        if (isNaN(target))
            return await client.twitch.say("❌ Invalid target number. Please provide a valid number.");

        // Parse numbers array
        const numberStrings = numsStr.trim().split(/\s+/);
        const numbers: number[] = [];

        for (const numStr of numberStrings) {
            const num = parseFloat(numStr);

            if (isNaN(num))
                return await client.twitch.say(`❌ Invalid number: \"${numStr}\". Please provide valid numbers.`);
            
            numbers.push(num);
        }

        if (numbers.length < 2)
            return await client.twitch.say("❌ Please provide at least 2 numbers to work with.");

        try {
            await client.twitch.say("Computing...");
            const initialExprs: readonly string[] = numbers.map(n => n.toString());
            const solution = findMathExpression(numbers, initialExprs, target);

            if (solution)
                await client.twitch.say(`🎉 Found it: ${solution} = ${target}`);
            
            else
                await client.twitch.say(`😕 No solution found`);
        }
        
        catch (error) {
            console.error('Math solver error:', error);
            await client.twitch.say("❌ An error occurred while solving. Please try again.");
        }
    }
}