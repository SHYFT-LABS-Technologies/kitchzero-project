// AI-powered inventory assistance
import { DEFAULT_CATEGORIES, COMMON_ITEMS_BY_CATEGORY } from './inventory-defaults';

// Comprehensive restaurant-grade item categorization patterns
const CATEGORIZATION_PATTERNS = {
  'Vegetables': [
    // Common vegetables
    'tomato', 'tomatoes', 'cherry tomato', 'roma tomato', 'beefsteak tomato', 'grape tomato',
    'onion', 'onions', 'red onion', 'white onion', 'yellow onion', 'shallot', 'scallion', 'green onion',
    'carrot', 'carrots', 'baby carrot', 'purple carrot', 'rainbow carrot',
    'potato', 'potatoes', 'russet', 'yukon', 'red potato', 'fingerling', 'sweet potato',
    'pepper', 'peppers', 'bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'orange pepper',
    'jalapeño', 'serrano', 'habanero', 'poblano', 'chipotle', 'anaheim', 'banana pepper',
    
    // Sri Lankan vegetables
    'cabbage', 'green cabbage', 'red cabbage', 'white cabbage',
    'leeks', 'leek', 'green leek',
    'okra', 'bandakka', 'ladies finger', 'lady finger',
    'bitter gourd', 'karawila', 'bitter melon',
    'snake gourd', 'pathola', 'snake beans',
    'drumsticks', 'murunga', 'moringa', 'drumstick leaves',
    'jak fruit', 'jackfruit', 'young jackfruit', 'polos', 'jak',
    'breadfruit', 'del', 'bread fruit',
    'plantain', 'kesel', 'green banana', 'cooking banana',
    'pumpkin', 'watakka', 'ash pumpkin', 'white pumpkin',
    'bottle gourd', 'labu', 'white gourd',
    'ridged gourd', 'wetakolu', 'luffa',
    'winged beans', 'dambala', 'four angled beans',
    'long beans', 'me karal', 'yard long beans',
    'green chilies', 'miris', 'sri lankan chilies', 'green chili',
    'red chilies', 'rathu miris', 'dried chilies', 'red chili',
    'green beans', 'bonchi', 'french beans',
    'carrot', 'carrot local', 'orange carrot',
    'beetroot', 'beetroot local', 'red beetroot',
    'radish', 'rabu', 'white radish', 'daikon',
    'sweet potato', 'bathala', 'orange sweet potato', 'purple sweet potato',
    'yam', 'ala', 'purple yam', 'water yam',
    'cassava', 'manioc', 'tapioca', 'manioca',
    'kohila', 'lasia spinosa', 'kohila leaves',
    'kankun', 'water spinach', 'morning glory',
    'nivithi', 'manathakali', 'black nightshade',
    'gherkin', 'thibbarwa', 'small cucumber',
    
    // Leafy greens
    'lettuce', 'romaine', 'iceberg', 'butter lettuce', 'boston lettuce', 'arugula', 'rocket',
    'spinach', 'baby spinach', 'mature spinach', 'kale', 'baby kale', 'curly kale', 'lacinato',
    'chard', 'swiss chard', 'rainbow chard', 'collard', 'mustard greens', 'turnip greens',
    'watercress', 'endive', 'radicchio', 'frisée', 'escarole', 'dandelion', 'bok choy', 'napa cabbage',
    
    // Sri Lankan leafy greens
    'gotukola', 'pennywort', 'gotu kola', 'indian pennywort',
    'mukunuwenna', 'tropical leafy green', 'alternanthera sessilis',
    'kathurumurunga', 'agathi leaves', 'sesbania grandiflora',
    'thebu', 'costus speciosus', 'thebu leaves',
    'sarana', 'sarana leaves', 'boerhaavia diffusa',
    'kankun', 'water spinach', 'morning glory', 'ipomoea aquatica',
    'nivithi', 'black nightshade', 'manathakali',
    'tampala', 'red spinach', 'amaranthus',
    'welpenela', 'cardiospermum halicacabum', 'balloon vine',
    'hathawariya', 'asparagus racemosus', 'asparagus leaves',
    'karavila leaves', 'bitter gourd leaves', 'momordica charantia',
    'lunu miris leaves', 'capsicum frutescens leaves',
    'curry leaves', 'karapincha', 'murraya koenigii', 'sweet neem',
    
    // Cruciferous
    'broccoli', 'broccoli crown', 'broccolini', 'cauliflower', 'purple cauliflower', 'romanesco',
    'cabbage', 'green cabbage', 'red cabbage', 'savoy cabbage', 'chinese cabbage',
    'brussels sprouts', 'kohlrabi',
    
    // Other vegetables
    'cucumber', 'english cucumber', 'persian cucumber', 'pickling cucumber',
    'celery', 'celery heart', 'celeriac', 'celery root',
    'zucchini', 'yellow squash', 'summer squash', 'pattypan', 'crookneck',
    'eggplant', 'japanese eggplant', 'italian eggplant', 'chinese eggplant',
    'beetroot', 'golden beet', 'candy cane beet', 'radish', 'daikon', 'watermelon radish',
    'turnip', 'rutabaga', 'parsnip', 'jicama', 'jerusalem artichoke',
    
    // Squash and gourds
    'pumpkin', 'sugar pumpkin', 'pie pumpkin', 'carving pumpkin', 'mini pumpkin',
    'butternut squash', 'acorn squash', 'delicata squash', 'kabocha squash', 'hubbard squash',
    'spaghetti squash', 'honeynut squash', 'carnival squash', 'dumpling squash',
    'gourd', 'bottle gourd', 'bitter gourd', 'ridge gourd',
    
    // Root vegetables and tubers
    'yam', 'sweet potato', 'purple sweet potato', 'japanese sweet potato',
    'cassava', 'yuca', 'taro', 'malanga', 'plantain', 'green plantain', 'ripe plantain',
    'water chestnut', 'lotus root', 'bamboo shoots',
    
    // Alliums (onion family)
    'garlic', 'garlic bulb', 'garlic cloves', 'elephant garlic', 'garlic scapes',
    'chives', 'chinese chives', 'garlic chives', 'ramp', 'wild garlic',
    
    // Brassicas and cabbages
    'watercress', 'nasturtium', 'microgreens', 'sprouts', 'alfalfa sprouts',
    'bean sprouts', 'mung bean sprouts', 'soybean sprouts',
    
    // Corn and legumes
    'corn', 'sweet corn', 'baby corn', 'corn kernels', 'corn on the cob',
    'peas', 'snap peas', 'snow peas', 'sugar snap', 'english peas', 'split peas',
    'green beans', 'french beans', 'haricot vert', 'yellow beans', 'romano beans',
    'lima beans', 'fava beans', 'edamame', 'black beans', 'kidney beans', 'pinto beans',
    
    // Specialty vegetables
    'asparagus', 'white asparagus', 'purple asparagus', 'artichoke', 'baby artichoke',
    'leek', 'baby leek', 'fennel', 'fennel bulb', 'okra', 'rhubarb',
    'mushroom', 'button mushroom', 'cremini', 'portobello', 'shiitake', 'oyster mushroom',
    'enoki', 'maitake', 'chanterelle', 'morel', 'porcini',
    
    // More common vegetables
    'ginger', 'fresh ginger', 'ginger root', 'galangal', 'turmeric root',
    'horseradish', 'wasabi', 'lemongrass', 'lemon grass',
    'seaweed', 'nori', 'wakame', 'kelp', 'sea lettuce', 'dulse',
    'aloe vera', 'cactus', 'nopales', 'prickly pear',
    'chayote', 'christophene', 'mirliton', 'kohlrabi',
    'swiss chard stems', 'rhubarb stalks', 'celery stalks'
  ],
  
  'Fruits': [
    // Citrus
    'orange', 'navel orange', 'blood orange', 'valencia orange', 'mandarin', 'tangerine', 'clementine',
    'lemon', 'meyer lemon', 'eureka lemon', 'lime', 'key lime', 'persian lime', 'kaffir lime',
    'grapefruit', 'ruby red grapefruit', 'pink grapefruit', 'white grapefruit',
    'yuzu', 'bergamot', 'pomelo',
    
    // Stone fruits
    'peach', 'white peach', 'yellow peach', 'donut peach', 'nectarine', 'white nectarine',
    'plum', 'red plum', 'black plum', 'italian plum', 'pluot', 'apricot', 'cherry',
    'sweet cherry', 'tart cherry', 'rainier cherry', 'bing cherry',
    
    // Berries
    'strawberry', 'organic strawberry', 'alpine strawberry', 'blueberry', 'wild blueberry',
    'raspberry', 'red raspberry', 'black raspberry', 'golden raspberry', 'blackberry',
    'boysenberry', 'elderberry', 'gooseberry', 'cranberry', 'lingonberry',
    'currant', 'red currant', 'black currant', 'white currant',
    
    // Tree fruits
    'apple', 'gala apple', 'fuji apple', 'honeycrisp', 'granny smith', 'red delicious',
    'golden delicious', 'braeburn', 'jonathan', 'mcintosh', 'pink lady',
    'pear', 'bartlett pear', 'anjou pear', 'bosc pear', 'asian pear', 'comice pear',
    
    // Tropical fruits
    'banana', 'plantain', 'mango', 'manila mango', 'ataulfo mango', 'tommy atkins',
    'pineapple', 'golden pineapple', 'papaya', 'hawaiian papaya', 'mexican papaya',
    'coconut', 'young coconut', 'passion fruit', 'dragon fruit', 'star fruit', 'carambola',
    'guava', 'lychee', 'rambutan', 'longan', 'jackfruit', 'durian',
    
    // Sri Lankan tropical fruits
    'fresh coconut', 'king coconut', 'thambili', 'orange coconut', 'coconut water',
    'ripe jackfruit', 'waraka', 'sweet jackfruit', 'jackfruit bulbs',
    'papaya', 'papaw', 'tree melon', 'green papaya', 'ripe papaya',
    'mango', 'amba', 'ripe mango', 'green mango', 'mango pickle',
    'pineapple', 'ananas', 'sweet pineapple', 'pineapple chunks',
    'banana', 'kesel', 'ambul banana', 'seeni kesel', 'ripe banana',
    'avocado', 'alligator pear', 'butter fruit',
    'passion fruit', 'passion', 'granadilla',
    'soursop', 'katu anoda', 'prickly custard apple',
    'custard apple', 'seeni atha', 'sugar apple', 'sweetsop',
    'wood apple', 'divul', 'feronia limonia', 'elephant apple',
    'beli fruit', 'bael fruit', 'aegle marmelos',
    'tamarind', 'siyambala', 'tamarindus indica', 'sour tamarind',
    'jambu', 'rose apple', 'water apple', 'syzygium aqueum',
    'rambutan', 'rambutan fruit', 'hairy lychee',
    'mangosteen', 'queen of fruits', 'garcinia mangostana',
    'durian', 'king of fruits', 'smelly fruit',
    'lime', 'dehi', 'green lime', 'sour lime',
    'lemon', 'lemon fruit', 'citrus lemon',
    
    // Melons
    'watermelon', 'seedless watermelon', 'yellow watermelon', 'cantaloupe', 'honeydew',
    'casaba melon', 'crenshaw melon', 'persian melon', 'santa claus melon',
    
    // Special fruits
    'avocado', 'hass avocado', 'fuerte avocado', 'bacon avocado', 'pinkerton avocado',
    'grape', 'red grape', 'green grape', 'black grape', 'concord grape', 'champagne grape',
    'fig', 'black mission fig', 'brown turkey fig', 'calimyrna fig',
    'pomegranate', 'persimmon', 'fuyu persimmon', 'hachiya persimmon',
    'kiwi', 'golden kiwi', 'date', 'medjool date', 'deglet noor',
    
    // Dried fruits
    'raisin', 'golden raisin', 'sultana', 'currant', 'dried cranberry', 'craisin',
    'dried apricot', 'dried fig', 'dried date', 'prune', 'dried plum',
    'dried cherry', 'dried blueberry', 'dried banana', 'banana chip'
  ],
  
  'Nuts & Seeds': [
    // Tree nuts
    'almond', 'raw almond', 'roasted almond', 'sliced almond', 'almond flour',
    'walnut', 'english walnut', 'black walnut', 'walnut halves', 'walnut pieces',
    'pecan', 'pecan halves', 'pecan pieces', 'candied pecan',
    'hazelnut', 'filbert', 'roasted hazelnut',
    'pistachio', 'shelled pistachio', 'roasted pistachio', 'salted pistachio',
    'cashew', 'raw cashew', 'roasted cashew', 'cashew pieces',
    'macadamia', 'macadamia nut', 'roasted macadamia',
    'brazil nut', 'pine nut', 'pignoli', 'pinon',
    'chestnut', 'roasted chestnut', 'water chestnut',
    
    // Seeds
    'sunflower seed', 'pumpkin seed', 'pepita', 'sesame seed', 'black sesame seed',
    'chia seed', 'flax seed', 'flaxseed', 'hemp seed', 'hemp heart',
    'poppy seed', 'caraway seed', 'fennel seed', 'dill seed',
    'watermelon seed', 'melon seed', 'nigella seed', 'black seed',
    
    // Nut and seed products
    'tahini', 'sesame paste', 'almond butter', 'cashew butter', 'sunflower butter',
    'peanut', 'peanut butter', 'roasted peanut', 'boiled peanut'
  ],
  
  'Meat & Poultry': [
    // Chicken
    'chicken', 'whole chicken', 'chicken breast', 'boneless breast', 'bone-in breast',
    'chicken thigh', 'boneless thigh', 'bone-in thigh', 'chicken wing', 'drumette',
    'chicken drumstick', 'chicken leg', 'chicken tender', 'chicken cutlet',
    'ground chicken', 'chicken sausage', 'rotisserie chicken', 'organic chicken', 'free-range chicken',
    
    // Beef
    'beef', 'ground beef', 'lean ground beef', 'ground chuck', 'ground sirloin',
    'ribeye', 'new york strip', 'filet mignon', 'tenderloin', 'sirloin', 'round steak',
    'flank steak', 'skirt steak', 'hanger steak', 'flat iron', 'tri-tip',
    'chuck roast', 'pot roast', 'brisket', 'short ribs', 'beef ribs', 'oxtail',
    'beef liver', 'beef heart', 'beef tongue', 'corned beef', 'pastrami',
    
    // Pork
    'pork', 'pork chop', 'bone-in chop', 'boneless chop', 'pork tenderloin', 'pork loin',
    'pork shoulder', 'boston butt', 'pork belly', 'spare ribs', 'baby back ribs',
    'ground pork', 'pork sausage', 'italian sausage', 'chorizo', 'bratwurst',
    'bacon', 'thick cut bacon', 'pancetta', 'prosciutto', 'ham', 'spiral ham',
    'pork hock', 'pork feet', 'pork rinds',
    
    // Lamb
    'lamb', 'leg of lamb', 'lamb chop', 'rack of lamb', 'lamb shank', 'lamb shoulder',
    'ground lamb', 'lamb sausage', 'lamb liver', 'lamb kidney',
    
    // Other poultry
    'turkey', 'whole turkey', 'turkey breast', 'turkey thigh', 'turkey wing',
    'ground turkey', 'turkey sausage', 'turkey bacon', 'smoked turkey',
    'duck', 'duck breast', 'duck leg', 'duck confit', 'whole duck',
    'goose', 'cornish hen', 'quail', 'pheasant', 'rabbit',
    
    // Processed meats
    'salami', 'pepperoni', 'mortadella', 'capicola', 'sopressata', 'bresaola',
    'kielbasa', 'andouille', 'merguez', 'boudin', 'blood sausage', 'liverwurst',
    'hot dog', 'frankfurter', 'vienna sausage', 'lunch meat', 'deli meat'
  ],
  
  'Seafood': [
    // Finfish
    'salmon', 'atlantic salmon', 'pacific salmon', 'king salmon', 'coho salmon', 'sockeye',
    'tuna', 'yellowfin tuna', 'bluefin tuna', 'albacore', 'skipjack', 'ahi tuna',
    'cod', 'atlantic cod', 'pacific cod', 'black cod', 'pollock', 'haddock',
    'halibut', 'flounder', 'sole', 'plaice', 'turbot', 'john dory',
    'sea bass', 'striped bass', 'chilean sea bass', 'black sea bass', 'branzino',
    'snapper', 'red snapper', 'yellowtail snapper', 'grouper', 'mahi mahi', 'dorado',
    'mackerel', 'spanish mackerel', 'king mackerel', 'sardine', 'anchovy', 'herring',
    'trout', 'rainbow trout', 'steelhead', 'brook trout', 'lake trout',
    'catfish', 'tilapia', 'swai', 'pangasius', 'monkfish', 'skate', 'ray',
    
    // Sri Lankan finfish
    'tuna', 'kelawalla', 'yellowfin tuna', 'skipjack tuna', 'big eye tuna',
    'mackerel', 'kumbalawa', 'spanish mackerel', 'indian mackerel',
    'kingfish', 'suraya', 'king mackerel', 'narrow barred spanish mackerel',
    'pomfret', 'avara', 'silver pomfret', 'black pomfret',
    'barramundi', 'koral', 'sea bass', 'giant sea perch',
    'red snapper', 'ratu mora', 'crimson snapper', 'mangrove red snapper',
    'grouper', 'kossa', 'giant grouper', 'honeycomb grouper',
    'parrotfish', 'gal keeraya', 'rainbow parrotfish',
    'seer fish', 'thora', 'spanish mackerel', 'narrow barred spanish mackerel',
    'sailfish', 'layya', 'indo pacific sailfish',
    'dolphin fish', 'mahi mahi', 'dorado', 'common dolphinfish',
    'marlin', 'black marlin', 'blue marlin', 'striped marlin',
    'shark', 'mora', 'bull shark', 'blacktip shark',
    'ray', 'madu', 'stingray', 'eagle ray',
    'flying fish', 'mas lelena', 'indian flying fish',
    'sardine', 'salaya', 'indian oil sardine', 'rainbow sardine',
    'anchovy', 'haal massa', 'white anchovy', 'indian anchovy',
    'butterfish', 'katta', 'silver pomfret', 'black pomfret',
    
    // Shellfish
    'shrimp', 'jumbo shrimp', 'tiger shrimp', 'rock shrimp', 'bay shrimp',
    'prawn', 'langostino', 'crawfish', 'crayfish', 'lobster', 'spiny lobster',
    'crab', 'dungeness crab', 'blue crab', 'king crab', 'snow crab', 'soft shell crab',
    
    // Sri Lankan shellfish and crustaceans
    'prawns', 'isso', 'giant tiger prawns', 'white prawns', 'banana prawns',
    'crab', 'kakulu', 'mud crab', 'blue swimmer crab', 'mangrove crab',
    'lobster', 'ura isso', 'spiny lobster', 'slipper lobster',
    'cuttlefish', 'dallo', 'reef squid', 'bigfin reef squid',
    'squid', 'dallo', 'indian squid', 'big fin squid',
    'octopus', 'asta pada', 'reef octopus', 'common octopus',
    'sea cucumber', 'sea holothurian', 'beche de mer',
    
    // Mollusks
    'scallop', 'sea scallop', 'bay scallop', 'diver scallop',
    'oyster', 'blue point oyster', 'kumamoto oyster', 'pacific oyster', 'eastern oyster',
    'mussel', 'blue mussel', 'green mussel', 'mediterranean mussel',
    'clam', 'littleneck clam', 'cherrystone', 'manila clam', 'razor clam', 'geoduck',
    'squid', 'calamari', 'octopus', 'cuttlefish', 'conch', 'abalone',
    
    // Specialty
    'sea urchin', 'uni', 'caviar', 'roe', 'salmon roe', 'ikura', 'tobiko',
    'smoked salmon', 'lox', 'gravlax', 'smoked trout', 'smoked mackerel',
    'fish', 'whole fish', 'fish fillet', 'fish steak'
  ],
  
  'Dairy & Eggs': [
    // Milk products
    'milk', 'whole milk', '2% milk', '1% milk', 'skim milk', 'non-fat milk',
    'organic milk', 'lactose-free milk', 'buttermilk', 'heavy cream', 'heavy whipping cream',
    'light cream', 'half and half', 'whipping cream', 'sour cream', 'crème fraîche',
    
    // Yogurt
    'yogurt', 'greek yogurt', 'plain yogurt', 'vanilla yogurt', 'fruit yogurt',
    'organic yogurt', 'low-fat yogurt', 'non-fat yogurt', 'probiotic yogurt',
    'kefir', 'labneh', 'skyr',
    
    // Cheese - Fresh
    'mozzarella', 'fresh mozzarella', 'buffalo mozzarella', 'smoked mozzarella',
    'ricotta', 'whole milk ricotta', 'part-skim ricotta', 'cottage cheese',
    'cream cheese', 'mascarpone', 'burrata', 'stracciatella',
    
    // Cheese - Soft
    'brie', 'camembert', 'goat cheese', 'chèvre', 'feta', 'queso fresco',
    'queso blanco', 'paneer', 'halloumi',
    
    // Cheese - Semi-hard
    'cheddar', 'sharp cheddar', 'mild cheddar', 'white cheddar', 'aged cheddar',
    'swiss', 'gruyère', 'emmental', 'jarlsberg', 'fontina', 'provolone',
    'monterey jack', 'pepper jack', 'colby', 'muenster', 'havarti',
    
    // Cheese - Hard
    'parmesan', 'parmigiano-reggiano', 'pecorino', 'pecorino romano', 'asiago',
    'romano', 'manchego', 'aged gouda', 'aged cheddar',
    
    // Butter
    'butter', 'unsalted butter', 'salted butter', 'european butter', 'cultured butter',
    'clarified butter', 'ghee', 'compound butter',
    
    // Eggs
    'eggs', 'large eggs', 'extra large eggs', 'medium eggs', 'jumbo eggs',
    'organic eggs', 'free-range eggs', 'cage-free eggs', 'pasture-raised eggs',
    'brown eggs', 'white eggs', 'duck eggs', 'quail eggs', 'goose eggs'
  ],
  
  'Grains & Cereals': [
    // Rice
    'rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'arborio rice',
    'short grain rice', 'long grain rice', 'wild rice', 'black rice', 'red rice',
    'sticky rice', 'sushi rice', 'bomba rice', 'carnaroli rice',
    
    // Sri Lankan rice varieties
    'red rice', 'rathu kekulu', 'traditional red rice', 'unpolished red rice',
    'white rice', 'sudu hal', 'samba rice', 'nadu rice', 'keeri samba',
    'basmati rice', 'basmati sudu hal', 'fragrant rice', 'long grain basmati',
    'parboiled rice', 'steam rice', 'converted rice', 'partially boiled rice',
    'broken rice', 'kekulu hal', 'rice fragments', 'budget rice',
    'jasmine rice', 'fragrant jasmine', 'thai jasmine rice',
    'kekulu rice', 'premium kekulu', 'sri lankan premium rice',
    
    // Pasta
    'pasta', 'spaghetti', 'linguine', 'fettuccine', 'angel hair', 'capellini',
    'penne', 'rigatoni', 'fusilli', 'rotini', 'farfalle', 'bow tie',
    'macaroni', 'shells', 'conchiglie', 'orecchiette', 'cavatappi',
    'lasagna sheets', 'ravioli', 'tortellini', 'gnocchi', 'orzo',
    'whole wheat pasta', 'gluten-free pasta', 'fresh pasta', 'dried pasta',
    
    // Noodles
    'noodles', 'ramen noodles', 'udon noodles', 'soba noodles', 'rice noodles',
    'pad thai noodles', 'lo mein noodles', 'egg noodles', 'cellophane noodles',
    'shirataki noodles', 'vermicelli', 'rice vermicelli',
    
    // Bread
    'bread', 'white bread', 'wheat bread', 'whole grain bread', 'sourdough',
    'rye bread', 'pumpernickel', 'baguette', 'ciabatta', 'focaccia',
    'pita bread', 'naan', 'tortilla', 'flour tortilla', 'corn tortilla',
    'bagel', 'english muffin', 'croissant', 'brioche', 'challah',
    
    // Flour and grains
    'flour', 'all-purpose flour', 'bread flour', 'cake flour', 'pastry flour',
    'whole wheat flour', 'almond flour', 'coconut flour', 'rice flour',
    'semolina', 'cornmeal', 'polenta', 'grits', 'hominy',
    'oats', 'rolled oats', 'steel cut oats', 'instant oats', 'oat bran',
    'quinoa', 'red quinoa', 'black quinoa', 'tri-color quinoa',
    'barley', 'pearl barley', 'hulled barley', 'wheat berries', 'bulgur',
    'farro', 'spelt', 'kamut', 'millet', 'amaranth', 'buckwheat',
    'chia seeds', 'flax seeds', 'hemp seeds', 'sunflower seeds', 'pumpkin seeds',
    
    // Sri Lankan legumes and pulses
    'lentils', 'parippu', 'red lentils', 'masoor dal', 'yellow lentils',
    'green lentils', 'mung beans', 'green gram', 'mung dal', 'green mung',
    'black gram', 'urad dal', 'black lentils', 'ulundu',
    'chickpeas', 'kadala', 'garbanzo beans', 'white chickpeas', 'black chickpeas',
    'cow peas', 'me karal', 'black eyed peas', 'southern peas',
    'pigeon peas', 'toor dal', 'arhar dal', 'red gram',
    'black beans', 'kalu karal', 'turtle beans', 'frijoles negros',
    'kidney beans', 'red kidney beans', 'rajma', 'white kidney beans',
    'lima beans', 'butter beans', 'madagascar beans', 'large lima',
    'soybeans', 'soya beans', 'edamame', 'green soybeans',
    
    // Breakfast items
    'cereal', 'granola', 'muesli', 'oatmeal', 'pancake mix', 'waffle mix',
    'crackers', 'graham crackers', 'saltines', 'water crackers'
  ],
  
  'Spices & Seasonings': [
    // Basic spices
    'salt', 'sea salt', 'kosher salt', 'table salt', 'himalayan salt', 'flaky salt',
    'pepper', 'black pepper', 'white pepper', 'pink peppercorn', 'green peppercorn',
    'cayenne pepper', 'red pepper flakes', 'paprika', 'smoked paprika', 'sweet paprika',
    
    // Fresh herbs
    'basil', 'sweet basil', 'thai basil', 'purple basil', 'oregano', 'fresh oregano',
    'thyme', 'fresh thyme', 'lemon thyme', 'rosemary', 'fresh rosemary',
    'sage', 'fresh sage', 'parsley', 'flat-leaf parsley', 'curly parsley',
    'cilantro', 'coriander leaves', 'dill', 'fresh dill', 'mint', 'spearmint', 'peppermint',
    'chives', 'tarragon', 'marjoram', 'lovage',
    
    // Dried herbs
    'dried basil', 'dried oregano', 'dried thyme', 'dried rosemary', 'dried sage',
    'dried parsley', 'dried dill', 'bay leaves', 'herbes de provence', 'italian seasoning',
    
    // Aromatics
    'garlic', 'fresh garlic', 'garlic powder', 'granulated garlic', 'garlic salt',
    'ginger', 'fresh ginger', 'ground ginger', 'crystallized ginger',
    'onion powder', 'shallot powder', 'celery seed', 'fennel seed',
    
    // International spices
    'cumin', 'ground cumin', 'cumin seed', 'coriander', 'ground coriander', 'coriander seed',
    'turmeric', 'ground turmeric', 'fresh turmeric', 'curry powder', 'garam masala',
    'cardamom', 'green cardamom', 'black cardamom', 'cinnamon', 'ceylon cinnamon',
    'cassia', 'cinnamon stick', 'nutmeg', 'whole nutmeg', 'mace', 'allspice',
    'cloves', 'whole cloves', 'star anise', 'anise seed', 'fenugreek',
    'mustard seed', 'yellow mustard seed', 'black mustard seed',
    
    // Sri Lankan spices and seasonings
    'ceylon cinnamon', 'kurundu', 'true cinnamon', 'cinnamon bark', 'cinnamon quills',
    'cardamom', 'enasal', 'green cardamom', 'large cardamom', 'ceylon cardamom',
    'cloves', 'karabu nati', 'ceylon cloves', 'whole cloves', 'clove buds',
    'nutmeg', 'sadikka', 'ceylon nutmeg', 'whole nutmeg', 'ground nutmeg',
    'mace', 'wasawasi', 'nutmeg mace', 'ground mace', 'whole mace',
    'black pepper', 'gammiris', 'ceylon black pepper', 'whole peppercorns', 'ground pepper',
    'white pepper', 'sudu miris', 'white peppercorns', 'ground white pepper',
    'coriander seeds', 'kottamalli', 'dhania', 'ground coriander', 'whole coriander',
    'cumin seeds', 'suduru', 'jeera', 'ground cumin', 'whole cumin',
    'fennel seeds', 'madu', 'sweet fennel', 'ground fennel', 'whole fennel',
    'fenugreek', 'uluhal', 'methi', 'ground fenugreek', 'fenugreek leaves',
    'mustard seeds', 'aba', 'brown mustard', 'yellow mustard', 'mustard powder',
    'turmeric', 'kaha', 'haldi', 'fresh turmeric', 'turmeric powder', 'turmeric root',
    'curry leaves', 'karapincha', 'fresh curry leaves', 'dried curry leaves',
    'pandan leaves', 'rampe', 'screwpine leaves', 'fresh pandan', 'pandan extract',
    'lemongrass', 'sera', 'fresh lemongrass', 'dried lemongrass', 'lemongrass powder',
    'lime leaves', 'dehi kolle', 'kaffir lime leaves', 'fresh lime leaves',
    'goraka', 'cambodge', 'garcinia cambogia', 'dried goraka', 'fish tamarind',
    'tamarind', 'siyambala', 'tamarind paste', 'tamarind pulp', 'dried tamarind',
    'sri lankan curry powder', 'unroasted curry powder', 'roasted curry powder',
    'ceylon five spice', 'panch phoran', 'sri lankan spice mix',
    'chili powder', 'miris kudu', 'red chili powder', 'cayenne powder',
    'chili flakes', 'miris kola', 'dried chili flakes', 'red pepper flakes',
    'ginger', 'inguru', 'fresh ginger', 'dried ginger', 'ginger powder',
    'garlic', 'sudu lunu', 'fresh garlic', 'garlic powder', 'garlic paste',
    
    // Chili and heat
    'chili powder', 'chipotle powder', 'ancho powder', 'guajillo powder',
    'cayenne', 'habanero powder', 'ghost pepper', 'carolina reaper',
    'hot sauce', 'sriracha', 'tabasco', 'harissa', 'sambal oelek',
    
    // Specialty seasonings
    'za\'atar', 'sumac', 'ras el hanout', 'baharat', 'berbere', 'dukkah',
    'chinese five spice', 'togarashi', 'furikake', 'sesame seeds',
    'black sesame', 'white sesame', 'tahini', 'miso paste',
    'vanilla', 'vanilla extract', 'vanilla bean', 'almond extract',
    'lemon extract', 'orange zest', 'lemon zest', 'lime zest'
  ],
  
  'Beverages': [
    // Water
    'water', 'sparkling water', 'mineral water', 'spring water', 'distilled water',
    'coconut water', 'alkaline water', 'flavored water',
    
    // Juices
    'orange juice', 'apple juice', 'grape juice', 'cranberry juice', 'grapefruit juice',
    'pineapple juice', 'tomato juice', 'vegetable juice', 'carrot juice', 'beet juice',
    'pomegranate juice', 'tart cherry juice', 'lemon juice', 'lime juice',
    'fresh juice', 'cold-pressed juice', 'juice concentrate',
    
    // Coffee
    'coffee', 'ground coffee', 'whole bean coffee', 'instant coffee', 'decaf coffee',
    'espresso', 'cold brew', 'french roast', 'medium roast', 'light roast',
    'organic coffee', 'fair trade coffee',
    
    // Tea
    'tea', 'black tea', 'green tea', 'white tea', 'oolong tea', 'pu-erh tea',
    'earl grey', 'english breakfast', 'jasmine tea', 'chamomile tea',
    'peppermint tea', 'ginger tea', 'rooibos', 'herbal tea', 'tea bags', 'loose leaf tea',
    
    // Alcoholic
    'beer', 'craft beer', 'lager', 'ale', 'ipa', 'stout', 'pilsner',
    'wine', 'red wine', 'white wine', 'rosé', 'champagne', 'prosecco', 'sparkling wine',
    'sake', 'mirin', 'cooking wine', 'sherry', 'port', 'vermouth',
    'vodka', 'gin', 'rum', 'whiskey', 'bourbon', 'scotch', 'brandy', 'cognac',
    'tequila', 'mezcal', 'liqueur',
    
    // Soft drinks
    'soda', 'cola', 'ginger ale', 'club soda', 'tonic water', 'energy drink',
    'sports drink', 'kombucha', 'smoothie', 'protein shake',
    
    // Milk alternatives
    'almond milk', 'soy milk', 'oat milk', 'coconut milk', 'rice milk',
    'cashew milk', 'hemp milk', 'pea milk', 'macadamia milk'
  ],
  
  'Pantry Staples': [
    // Oils
    'oil', 'olive oil', 'extra virgin olive oil', 'canola oil', 'vegetable oil',
    'sunflower oil', 'safflower oil', 'grapeseed oil', 'avocado oil', 'coconut oil',
    'sesame oil', 'peanut oil', 'corn oil', 'walnut oil', 'truffle oil',
    'cooking spray', 'butter-flavored spray',
    
    // Sri Lankan oils and fats
    'coconut oil', 'pol tel', 'virgin coconut oil', 'extra virgin coconut oil',
    'sesame oil', 'thala tel', 'gingelly oil', 'til oil', 'cold pressed sesame oil',
    'mustard oil', 'aba tel', 'sarson ka tel', 'cold pressed mustard oil',
    'sunflower oil', 'suryakanthi tel', 'refined sunflower oil',
    'palm oil', 'palm kernel oil', 'red palm oil',
    'ghee', 'ghi', 'clarified butter', 'buffalo ghee', 'cow ghee',
    
    // Vinegars
    'vinegar', 'white vinegar', 'apple cider vinegar', 'balsamic vinegar',
    'red wine vinegar', 'white wine vinegar', 'rice vinegar', 'champagne vinegar',
    'sherry vinegar', 'malt vinegar', 'aged balsamic', 'balsamic glaze',
    
    // Sweeteners
    'sugar', 'white sugar', 'brown sugar', 'light brown sugar', 'dark brown sugar',
    'powdered sugar', 'confectioners sugar', 'raw sugar', 'turbinado', 'demerara',
    'coconut sugar', 'maple sugar', 'honey', 'raw honey', 'agave nectar',
    'maple syrup', 'corn syrup', 'simple syrup', 'molasses', 'stevia',
    'artificial sweetener', 'monk fruit sweetener',
    
    // Condiments
    'ketchup', 'mustard', 'yellow mustard', 'dijon mustard', 'whole grain mustard',
    'mayonnaise', 'aioli', 'ranch dressing', 'caesar dressing', 'italian dressing',
    'balsamic dressing', 'vinaigrette', 'salad dressing',
    'soy sauce', 'tamari', 'teriyaki sauce', 'hoisin sauce', 'oyster sauce',
    'fish sauce', 'worcestershire sauce', 'hot sauce', 'barbecue sauce',
    'marinara sauce', 'tomato sauce', 'pasta sauce', 'alfredo sauce', 'pesto',
    
    // Stocks and broths
    'chicken stock', 'beef stock', 'vegetable stock', 'mushroom stock',
    'chicken broth', 'beef broth', 'vegetable broth', 'bone broth',
    'dashi', 'miso broth', 'bouillon', 'soup base',
    
    // Canned goods
    'canned tomatoes', 'diced tomatoes', 'crushed tomatoes', 'tomato paste', 'tomato puree',
    'canned beans', 'black beans', 'kidney beans', 'chickpeas', 'garbanzo beans',
    'white beans', 'navy beans', 'pinto beans', 'refried beans',
    'canned corn', 'canned peas', 'canned carrots', 'canned beets',
    'coconut milk', 'evaporated milk', 'condensed milk', 'cream of mushroom',
    'cream of chicken', 'cream of celery',
    
    // Sri Lankan coconut products and pantry staples
    'coconut milk', 'kiri pol', 'thick coconut milk', 'thin coconut milk', 'coconut cream',
    'desiccated coconut', 'pol goda', 'shredded coconut', 'coconut flakes',
    'coconut flour', 'pol piti', 'fine coconut flour', 'coarse coconut flour',
    'coconut water', 'pol watura', 'fresh coconut water', 'bottled coconut water',
    'coconut vinegar', 'pol vinegar', 'natural coconut vinegar',
    'jaggery', 'pol hakuru', 'coconut jaggery', 'palm jaggery', 'kithul hakuru',
    'treacle', 'pani', 'coconut treacle', 'kithul treacle', 'palm treacle',
    'rice flour', 'indi appa piti', 'red rice flour', 'white rice flour',
    'kurakkan flour', 'finger millet flour', 'ragi flour',
    'coconut sambol', 'pol sambol', 'prepared coconut relish',
    'fish sauce', 'jaadi', 'fermented fish sauce', 'anchovy sauce',
    'dried fish', 'karawala', 'dried sprats', 'maldive fish', 'umbalakada',
    
    // Jarred items
    'jam', 'jelly', 'preserves', 'marmalade', 'peanut butter', 'almond butter',
    'tahini', 'nutella', 'honey', 'capers', 'olives', 'pickles', 'relish',
    'salsa', 'picante sauce', 'enchilada sauce', 'taco sauce',
    
    // Baking essentials
    'baking powder', 'baking soda', 'cream of tartar', 'cornstarch', 'arrowroot',
    'gelatin', 'agar', 'yeast', 'active dry yeast', 'instant yeast', 'fresh yeast',
    'chocolate chips', 'cocoa powder', 'dark chocolate', 'milk chocolate', 'white chocolate',
    
    // Specialty items
    'truffle paste', 'anchovy paste', 'tomato paste', 'harissa paste',
    'curry paste', 'miso paste', 'gochujang', 'doubanjiang',
    'rice wine', 'shaoxing wine', 'marsala wine', 'madeira wine'
  ],
  
  'Dry Goods': [
    // Sri Lankan specialty dry goods
    'desiccated coconut', 'pol goda', 'shredded coconut', 'coconut flakes', 'fine coconut',
    'coconut flour', 'pol piti', 'coconut powder', 'coconut meal',
    'rice flour', 'indi appa piti', 'red rice flour', 'white rice flour', 'roasted rice flour',
    'kurakkan flour', 'finger millet flour', 'ragi flour', 'millet flour',
    'cashew nuts', 'cadju', 'raw cashews', 'roasted cashews', 'cashew pieces',
    'peanuts', 'rata kadala', 'groundnuts', 'roasted peanuts', 'raw peanuts',
    'sesame seeds', 'thala', 'white sesame', 'black sesame', 'hulled sesame',
    'dried chilies', 'alu miris', 'red chilies', 'bird eye chilies', 'long red chilies',
    'dried fish', 'karawala', 'dried sprats', 'maldive fish', 'umbalakada', 'dried mackerel',
    'dried shrimp', 'dried prawns', 'jaadi isso', 'small dried shrimp',
    'poppadum', 'papadam', 'plain poppadum', 'pepper poppadum', 'garlic poppadum',
    'jaggery', 'pol hakuru', 'coconut jaggery', 'palm jaggery', 'kithul hakuru',
    'rock salt', 'inda lunu', 'sea salt', 'crystal salt',
    'dried lime', 'dehi dried', 'lime pickle', 'preserved lime',
    'goraka', 'cambodge', 'garcinia', 'fish tamarind', 'dried goraka',
    'breadfruit chips', 'del chips', 'jackfruit chips', 'banana chips',
    'string hoppers flour', 'idi appa piti', 'rice noodle flour'
  ]
};

// Unit suggestions based on category
const UNIT_SUGGESTIONS = {
  'Vegetables': 'kg',
  'Fruits': 'kg',
  'Nuts & Seeds': 'grams',
  'Meat & Poultry': 'kg',
  'Seafood': 'kg',
  'Dairy & Eggs': 'pieces', // More appropriate for eggs, cheese blocks
  'Grains & Cereals': 'kg',
  'Spices & Seasonings': 'grams',
  'Beverages': 'liters',
  'Pantry Staples': 'liters',
  'Dry Goods': 'kg'
};

// Expiry patterns (days from purchase date)
const EXPIRY_PATTERNS = {
  'Vegetables': {
    'leafy': 3, // lettuce, spinach, kale
    'root': 14, // carrots, potatoes, onions
    'fresh': 7, // tomatoes, peppers, cucumbers
    'default': 7
  },
  'Fruits': {
    'citrus': 14, // oranges, lemons, limes
    'stone': 5, // peaches, plums
    'berry': 3, // strawberries, blueberries
    'tropical': 7, // mango, pineapple
    'default': 7
  },
  'Nuts & Seeds': {
    'fresh': 30, // fresh nuts
    'roasted': 90, // roasted nuts
    'seeds': 180, // chia, flax seeds
    'nut_butter': 90, // almond butter, peanut butter
    'default': 90
  },
  'Meat & Poultry': {
    'fresh': 3,
    'frozen': 90,
    'processed': 7, // sausages, bacon
    'default': 3
  },
  'Seafood': {
    'fresh': 2,
    'frozen': 60,
    'default': 2
  },
  'Dairy & Eggs': {
    'milk': 7,
    'cheese': 21,
    'eggs': 21,
    'default': 7
  },
  'Grains & Cereals': {
    'default': 365
  },
  'Spices & Seasonings': {
    'default': 730 // 2 years
  },
  'Beverages': {
    'fresh': 7,
    'default': 90
  },
  'Pantry Staples': {
    'default': 365
  },
  'Dry Goods': {
    'default': 365
  }
};

export interface AIInventorySuggestion {
  category?: string;
  unit?: string;
  suggestedExpiryDate?: string;
  confidence: number;
  reasoning: string;
}

export interface ItemAnalysis {
  name: string;
  normalizedName: string;
  detectedKeywords: string[];
  categoryMatches: Array<{ category: string; score: number; keywords: string[] }>;
}

/**
 * Analyzes an item name and provides AI suggestions
 */
export function analyzeItem(itemName: string, purchaseDate?: string): AIInventorySuggestion {
  const analysis = analyzeItemName(itemName);
  const category = predictCategory(analysis);
  const unit = category ? UNIT_SUGGESTIONS[category] : undefined;
  const expiryDate = category && purchaseDate ? predictExpiryDate(category, itemName, purchaseDate) : undefined;
  
  return {
    category,
    unit,
    suggestedExpiryDate: expiryDate,
    confidence: analysis.categoryMatches[0]?.score || 0,
    reasoning: generateReasoning(analysis, category, unit, expiryDate)
  };
}

/**
 * Analyzes item name to extract meaningful keywords
 */
function analyzeItemName(itemName: string): ItemAnalysis {
  const normalizedName = itemName.toLowerCase().trim();
  const words = normalizedName.split(/[\s\-_,]+/).filter(word => word.length > 2);
  
  // Find category matches
  const categoryMatches: Array<{ category: string; score: number; keywords: string[] }> = [];
  
  for (const [category, patterns] of Object.entries(CATEGORIZATION_PATTERNS)) {
    const matchedKeywords: string[] = [];
    let score = 0;
    
    for (const pattern of patterns) {
      // Exact match
      if (normalizedName.includes(pattern)) {
        matchedKeywords.push(pattern);
        score += pattern.length === normalizedName.length ? 10 : 5; // Exact vs partial match
      }
      
      // Word match
      for (const word of words) {
        if (word.includes(pattern) || pattern.includes(word)) {
          if (!matchedKeywords.includes(pattern)) {
            matchedKeywords.push(pattern);
            score += 3;
          }
        }
      }
    }
    
    if (score > 0) {
      categoryMatches.push({ category, score, keywords: matchedKeywords });
    }
  }
  
  // Sort by score
  categoryMatches.sort((a, b) => b.score - a.score);
  
  return {
    name: itemName,
    normalizedName,
    detectedKeywords: words,
    categoryMatches
  };
}

/**
 * Predicts the most likely category
 */
function predictCategory(analysis: ItemAnalysis): string | undefined {
  if (analysis.categoryMatches.length === 0) {
    return undefined;
  }
  
  const topMatch = analysis.categoryMatches[0];
  
  // Require minimum confidence
  if (topMatch.score < 3) {
    return undefined;
  }
  
  return topMatch.category;
}

/**
 * Predicts expiry date based on category and item characteristics
 */
function predictExpiryDate(category: string, itemName: string, purchaseDate: string): string {
  const patterns = EXPIRY_PATTERNS[category];
  if (!patterns) {
    return addDaysToDate(purchaseDate, 7); // Default 7 days
  }
  
  const normalizedName = itemName.toLowerCase();
  let days = patterns.default;
  
  // Check for specific patterns
  if (category === 'Vegetables') {
    if (/lettuce|spinach|kale|arugula|chard/i.test(normalizedName)) {
      days = patterns.leafy;
    } else if (/carrot|potato|onion|beetroot|radish/i.test(normalizedName)) {
      days = patterns.root;
    } else {
      days = patterns.fresh;
    }
  } else if (category === 'Fruits') {
    if (/orange|lemon|lime|grapefruit/i.test(normalizedName)) {
      days = patterns.citrus;
    } else if (/strawberry|blueberry|raspberry|blackberry/i.test(normalizedName)) {
      days = patterns.berry;
    } else if (/peach|plum|apricot/i.test(normalizedName)) {
      days = patterns.stone;
    } else if (/mango|pineapple|papaya|coconut/i.test(normalizedName)) {
      days = patterns.tropical;
    }
  } else if (category === 'Meat & Poultry') {
    if (/frozen/i.test(normalizedName)) {
      days = patterns.frozen;
    } else if (/sausage|bacon|ham|processed/i.test(normalizedName)) {
      days = patterns.processed;
    } else {
      days = patterns.fresh;
    }
  } else if (category === 'Seafood') {
    if (/frozen/i.test(normalizedName)) {
      days = patterns.frozen;
    } else {
      days = patterns.fresh;
    }
  } else if (category === 'Nuts & Seeds') {
    if (/butter|paste/i.test(normalizedName)) {
      days = patterns.nut_butter;
    } else if (/roasted|salted/i.test(normalizedName)) {
      days = patterns.roasted;
    } else if (/seed|chia|flax|hemp/i.test(normalizedName)) {
      days = patterns.seeds;
    } else if (/fresh/i.test(normalizedName)) {
      days = patterns.fresh;
    }
  } else if (category === 'Dairy & Eggs') {
    if (/milk/i.test(normalizedName)) {
      days = patterns.milk;
    } else if (/cheese/i.test(normalizedName)) {
      days = patterns.cheese;
    } else if (/egg/i.test(normalizedName)) {
      days = patterns.eggs;
    }
  }
  
  return addDaysToDate(purchaseDate, days);
}

/**
 * Adds days to a date string and returns formatted date
 */
function addDaysToDate(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generates human-readable reasoning for the suggestions
 */
function generateReasoning(analysis: ItemAnalysis, category?: string, unit?: string, expiryDate?: string): string {
  const parts: string[] = [];
  
  if (category && analysis.categoryMatches.length > 0) {
    const topMatch = analysis.categoryMatches[0];
    parts.push(`Detected as "${category}" based on keywords: ${topMatch.keywords.slice(0, 3).join(', ')}`);
  }
  
  if (unit) {
    parts.push(`Suggested unit "${unit}" is typical for ${category} items`);
  }
  
  if (expiryDate) {
    const days = Math.round((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    parts.push(`Estimated ${days} days shelf life based on ${category} storage patterns`);
  }
  
  return parts.join('. ') || 'No specific patterns detected';
}

/**
 * Learns from user corrections to improve future predictions
 */
export function learnFromCorrection(
  itemName: string, 
  predictedCategory: string, 
  actualCategory: string,
  predictedExpiry: string,
  actualExpiry: string
) {
  // In a real implementation, this would update ML models or pattern weights
  // For now, we'll just log for future improvement
  console.log('🧠 AI Learning:', {
    item: itemName,
    predicted: { category: predictedCategory, expiry: predictedExpiry },
    actual: { category: actualCategory, expiry: actualExpiry },
    timestamp: new Date().toISOString()
  });
  
  // TODO: Store this in local storage or send to analytics endpoint
  // to improve future predictions
}