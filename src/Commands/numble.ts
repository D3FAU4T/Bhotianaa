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
            return client.twitch.say(context.channel, "Usage: !numble <target>; <num1> <num2> <num3>...");

        // Parse target number
        const target = parseFloat(goalStr.trim());
        if (isNaN(target))
            return client.twitch.say(context.channel, "❌ Invalid target number. Please provide a valid number.");

        // Parse numbers array
        const numberStrings = numsStr.trim().split(/\s+/);
        const numbers: number[] = [];

        for (const numStr of numberStrings) {
            const num = parseFloat(numStr);

            if (isNaN(num))
                return client.twitch.say(context.channel, `❌ Invalid number: "${numStr}". Please provide valid numbers.`);
            
            numbers.push(num);
        }

        if (numbers.length < 2)
            return client.twitch.say(context.channel, "❌ Please provide at least 2 numbers to work with.");

        try {
            const initialExprs: readonly string[] = numbers.map(n => n.toString());
            const solution = findMathExpression(numbers, initialExprs, target);

            if (solution)
                client.twitch.say(context.channel, `🎉 Found it: ${solution} = ${target}`);
            
            else
                client.twitch.say(context.channel, `😕 No solution found`);
        }
        
        catch (error) {
            console.error('Math solver error:', error);
            client.twitch.say(context.channel, "❌ An error occurred while solving. Please try again.");
        }
    }
}