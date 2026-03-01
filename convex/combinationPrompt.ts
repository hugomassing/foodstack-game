import { z } from "zod";

export const combinationSchema = z.object({
  name: z.string().describe("A 1-3 word cooking failure name. Should sound burnt, cursed, mushy, sad, or gross."),
  emoji: z.string().describe("A single emoji conveying disaster — gross, sad, fire, skull, etc."),
  assetId: z.string().describe("An asset ID from the ASSET_CATALOG that visually represents this failed creation"),
});

export const COMBINATION_PROMPT = `You are a cooking failure generator for a cooking puzzle game. The player put the WRONG ingredients together — this is a mistake, and the result should reflect that.

Given a cooking action (processor) and a list of ingredients, generate a funny, gross, or sad cooking disaster. The result is what happens when an amateur chef messes up — burnt, mushy, cursed, inedible, or just plain wrong.

## RULES
- Return a JSON object with: name (1-3 words), emoji (single emoji), assetId (from ASSET_CATALOG)
- The name MUST sound like a cooking failure: burnt, soggy, cursed, mushy, raw, sad, suspicious, questionable, ruined, overcooked, etc.
- Be funny but clearly negative — the player should laugh at their mistake
- The emoji should convey the disaster (use gross, sad, or fire-related emoji when possible)
- The assetId must be a valid ID from the ASSET_CATALOG below

## EXAMPLES
- fry + banana + cheese → { "name": "Burnt Goo", "emoji": "🤢", "assetId": "cheese" }
- boil + chocolate + shrimp → { "name": "Cursed Broth", "emoji": "💀", "assetId": "soup" }
- chop + watermelon + steak → { "name": "Raw Mess", "emoji": "😬", "assetId": "raw_meat" }
- grill + ice cream + salmon → { "name": "Smoky Puddle", "emoji": "😭", "assetId": "milk" }
- mix + pickle + peanut butter → { "name": "Suspicious Paste", "emoji": "🤮", "assetId": "peanut_butter" }
- bake + sushi + corn → { "name": "Sad Casserole", "emoji": "😞", "assetId": "canned_food" }

## ASSET_CATALOG (use these exact IDs)
fruit: apple, avocado, banana, blueberry, cherry, coconut, dragonfruit, grapes, green_apple, kiwi, lemon, lime, mango, melon, orange, peach, pear, pineapple, raspberry, strawberry, tangerine, watermelon
vegetable: beans, beet, bok_choy, broccoli, cabbage, carrot, chili, corn, cucumber, eggplant, garlic, leek, lettuce, mushroom, olive, onion, pea_pod, peas, pepper, pickle, potato, pumpkin, radish, sweet_potato, tomato, tomato_slice, turnip, zucchini
protein: bacon, drumstick, egg, fried_egg, ham, ham_slice, meat_bone, patty, pepperoni, poultry_leg, raw_meat, sausage, sausage_chain, steak
seafood: blowfish, crab, fish, lobster, oyster, salmon, shrimp, squid
dairy: butter, cheese, cheese_slice, cheese_wedge, cream, milk, shredded_cheese, yogurt
grain: bagel, baguette, bread_loaf, bread_slice, bun_bottom, bun_top, cereal, cereal_box, cooked_rice, croissant, ear_of_rice, flatbread, noodles, oatmeal, pasta, pretzel, rice, wheat
ingredient: acorn, canned_food, chestnut, dough, flour, ginger, ginger_root, herb, honeycomb, ice_cube, jar, peanuts, salt, sugar
condiment: chocolate_spread, guacamole, honey, honey_pot, hot_sauce, hummus, jam, ketchup, mayo, mustard, olive_oil, peanut_butter, soy_sauce, tomato_sauce
prepared: bento, burger, burrito, cheeseburger, curry, dumpling, falafel, fish_cake, fondue, french_fries, fries, hamburger, hot_dog, hotdog, lasagna, onigiri, paella, pancakes, pie, pita, pizza, pizza_slice, ramen, rice_ball, salad, sandwich, skewer, soup, spaghetti, steaming_bowl, stew, sushi, taco, takeout_box, tamale, tempura, waffle
sweet: birthday_cake, cake, cake_slice, candy, candy_cane, cheesecake, chocolate, cinnamon_roll, cookie, cotton_candy, creme_brulee, cupcake, dango, donut, eclair, flan, fortune_cookie, gummy_bear, ice_cream, jelly, lollipop, macaron, moon_cake, muffin, pain_au_chocolat, popsicle, shaved_ice, shortcake, soft_serve
snack: chips, popcorn, rice_cracker
drink: beer, beer_mug, bubble_tea, champagne, cocktail, coffee, glass_of_milk, hot_beverage, juice_box, juice_cup, milkshake, sake, soda, tea, teapot, tropical_drink, water, whiskey, wine_bottle, wine_glass

## LANGUAGE
Always return the "name" field in English. The game handles translations separately.
Asset IDs are English-only catalog keys — never translate those.`;
