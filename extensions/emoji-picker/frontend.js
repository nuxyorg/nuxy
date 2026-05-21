const EXT_ID = 'com.nuxy.emoji-picker'
const COLS = 9

// ─── Emoji Data ───────────────────────────────────────────────────────────────
// Format: { e: emoji, n: name, k: keywords }

const EMOJI_DATA = [
  {
    id: 'smileys',
    label: 'Smileys & People',
    icon: '😊',
    emojis: [
      { e: '😀', n: 'grinning face', k: 'happy smile grin joy' },
      { e: '😃', n: 'grinning face with big eyes', k: 'happy smile excited' },
      { e: '😄', n: 'grinning face with smiling eyes', k: 'happy smile joy laugh' },
      { e: '😁', n: 'beaming face with smiling eyes', k: 'grin smile happy' },
      { e: '😆', n: 'grinning squinting face', k: 'laugh happy xd lol' },
      { e: '😅', n: 'grinning face with sweat', k: 'nervous awkward laugh relief' },
      { e: '🤣', n: 'rolling on the floor laughing', k: 'rofl lol hilarious' },
      { e: '😂', n: 'face with tears of joy', k: 'lol laugh cry tears funny' },
      { e: '🙂', n: 'slightly smiling face', k: 'smile ok content' },
      { e: '🙃', n: 'upside-down face', k: 'silly sarcastic ironic' },
      { e: '😉', n: 'winking face', k: 'wink flirt joke hint' },
      { e: '😊', n: 'smiling face with smiling eyes', k: 'blush happy sweet warm' },
      { e: '😇', n: 'smiling face with halo', k: 'angel innocent pure good' },
      { e: '🥰', n: 'smiling face with hearts', k: 'love adore crush cute' },
      { e: '😍', n: 'smiling face with heart-eyes', k: 'love beautiful amazing heart' },
      { e: '🤩', n: 'star-struck', k: 'star eyes excited amazing wow' },
      { e: '😘', n: 'face blowing a kiss', k: 'kiss love blowing heart' },
      { e: '😗', n: 'kissing face', k: 'kiss pucker' },
      { e: '😚', n: 'kissing face with closed eyes', k: 'kiss sweet love' },
      { e: '😙', n: 'kissing face with smiling eyes', k: 'kiss smile love' },
      { e: '🥲', n: 'smiling face with tear', k: 'happy cry touched bittersweet' },
      { e: '😋', n: 'face savoring food', k: 'yummy delicious tongue food' },
      { e: '😛', n: 'face with tongue', k: 'tongue silly playful' },
      { e: '😜', n: 'winking face with tongue', k: 'silly wink tongue playful' },
      { e: '🤪', n: 'zany face', k: 'crazy wild goofy silly' },
      { e: '😝', n: 'squinting face with tongue', k: 'tongue gross teasing' },
      { e: '🤑', n: 'money-mouth face', k: 'money rich greedy cash' },
      { e: '🤗', n: 'smiling face with open hands', k: 'hug warm embrace friendly' },
      { e: '🤭', n: 'face with hand over mouth', k: 'oops secret giggle shy' },
      { e: '🤫', n: 'shushing face', k: 'quiet shh secret silence' },
      { e: '🤔', n: 'thinking face', k: 'think hmm pondering curious' },
      { e: '🤐', n: 'zipper-mouth face', k: 'quiet secret zip mouth' },
      { e: '🤨', n: 'face with raised eyebrow', k: 'suspicious skeptical doubt' },
      { e: '😐', n: 'neutral face', k: 'meh blank expressionless neutral' },
      { e: '😑', n: 'expressionless face', k: 'blank deadpan unamused' },
      { e: '😶', n: 'face without mouth', k: 'silent quiet speechless' },
      { e: '😏', n: 'smirking face', k: 'smirk sly confident flirt' },
      { e: '😒', n: 'unamused face', k: 'bored annoyed unimpressed side-eye' },
      { e: '🙄', n: 'face with rolling eyes', k: 'eyeroll sigh whatever bored' },
      { e: '😬', n: 'grimacing face', k: 'grimace nervous awkward cringe' },
      { e: '🤥', n: 'lying face', k: 'lie pinocchio nose' },
      { e: '😔', n: 'pensive face', k: 'sad thoughtful pensive disappointed' },
      { e: '😪', n: 'sleepy face', k: 'sleepy tired drool' },
      { e: '🤤', n: 'drooling face', k: 'drool hungry sleep desire' },
      { e: '😴', n: 'sleeping face', k: 'sleep tired zzz rest' },
      { e: '😷', n: 'face with medical mask', k: 'sick mask ill covid' },
      { e: '🤒', n: 'face with thermometer', k: 'sick fever ill temperature' },
      { e: '🤕', n: 'face with head-bandage', k: 'hurt injured pain owie' },
      { e: '🤢', n: 'nauseated face', k: 'sick nausea gross ill green' },
      { e: '🤮', n: 'face vomiting', k: 'vomit sick gross barf' },
      { e: '🤧', n: 'sneezing face', k: 'sneeze cold sick tissue' },
      { e: '🥵', n: 'hot face', k: 'hot sweat heat overheated fire' },
      { e: '🥶', n: 'cold face', k: 'cold freezing ice blue' },
      { e: '🥴', n: 'woozy face', k: 'drunk dizzy woozy confused' },
      { e: '😵', n: 'dizzy face', k: 'dizzy dead stunned shocked spiral' },
      { e: '🤯', n: 'exploding head', k: 'mindblown shocked surprised explosion' },
      { e: '🤠', n: 'cowboy hat face', k: 'cowboy western yeehaw hat' },
      { e: '🥳', n: 'partying face', k: 'party celebrate birthday fun' },
      { e: '🥸', n: 'disguised face', k: 'disguise incognito glasses spy' },
      { e: '😎', n: 'smiling face with sunglasses', k: 'cool sunglasses awesome chill' },
      { e: '🤓', n: 'nerd face', k: 'nerd geek glasses smart' },
      { e: '🧐', n: 'face with monocle', k: 'monocle curious investigate fancy' },
      { e: '😕', n: 'confused face', k: 'confused hmm puzzled' },
      { e: '😟', n: 'worried face', k: 'worried anxious concerned' },
      { e: '🙁', n: 'slightly frowning face', k: 'sad unhappy frown' },
      { e: '☹️', n: 'frowning face', k: 'sad frown unhappy' },
      { e: '😮', n: 'face with open mouth', k: 'surprised shocked oh wow' },
      { e: '😯', n: 'hushed face', k: 'surprised shocked hushed' },
      { e: '😲', n: 'astonished face', k: 'astonished shocked wow omg gasp' },
      { e: '😳', n: 'flushed face', k: 'embarrassed flushed blush shocked' },
      { e: '🥺', n: 'pleading face', k: 'pleading puppy eyes cute sad beg' },
      { e: '😦', n: 'frowning face with open mouth', k: 'frown worry afraid' },
      { e: '😧', n: 'anguished face', k: 'anguish pain worried' },
      { e: '😨', n: 'fearful face', k: 'fear scared frightened' },
      { e: '😰', n: 'anxious face with sweat', k: 'anxious nervous sweat fear' },
      { e: '😥', n: 'sad but relieved face', k: 'sad relieved disappointed' },
      { e: '😢', n: 'crying face', k: 'cry sad tears weep' },
      { e: '😭', n: 'loudly crying face', k: 'cry sob sad bawl tears' },
      { e: '😱', n: 'face screaming in fear', k: 'scream fear horror shocked' },
      { e: '😖', n: 'confounded face', k: 'frustrated confused struggling' },
      { e: '😣', n: 'persevering face', k: 'struggling trying hard effort' },
      { e: '😞', n: 'disappointed face', k: 'disappointed sad let down' },
      { e: '😓', n: 'downcast face with sweat', k: 'tired hard work down' },
      { e: '😩', n: 'weary face', k: 'weary exhausted tired done' },
      { e: '😫', n: 'tired face', k: 'tired exhausted worn out' },
      { e: '🥱', n: 'yawning face', k: 'yawn bored sleepy tired' },
      { e: '😤', n: 'face with steam from nose', k: 'angry triumph proud steam' },
      { e: '😡', n: 'enraged face', k: 'angry rage mad pout red' },
      { e: '😠', n: 'angry face', k: 'angry mad upset' },
      { e: '🤬', n: 'face with symbols on mouth', k: 'swearing cursing angry rage' },
      { e: '💀', n: 'skull', k: 'dead death die skull danger' },
      { e: '☠️', n: 'skull and crossbones', k: 'dead poison danger' },
      { e: '💩', n: 'pile of poo', k: 'poop shit turd funny joke' },
      { e: '🤡', n: 'clown face', k: 'clown joker silly circus' },
      { e: '👹', n: 'ogre', k: 'ogre monster demon japanese' },
      { e: '👺', n: 'goblin', k: 'goblin demon japanese red' },
      { e: '👻', n: 'ghost', k: 'ghost halloween boo scary' },
      { e: '👽', n: 'alien', k: 'alien ufo extraterrestrial space' },
      { e: '👾', n: 'alien monster', k: 'monster game alien arcade' },
      { e: '🤖', n: 'robot', k: 'robot ai machine bot' },
    ],
  },
  {
    id: 'people',
    label: 'People & Body',
    icon: '👋',
    emojis: [
      { e: '👋', n: 'waving hand', k: 'wave hello hi bye' },
      { e: '🤚', n: 'raised back of hand', k: 'hand raised stop' },
      { e: '🖐️', n: 'hand with fingers splayed', k: 'hand five stop' },
      { e: '✋', n: 'raised hand', k: 'hand stop high five' },
      { e: '🖖', n: 'vulcan salute', k: 'spock star trek live long' },
      { e: '👌', n: 'ok hand', k: 'ok perfect cool' },
      { e: '🤌', n: 'pinched fingers', k: 'italian chef kiss perfect' },
      { e: '🤏', n: 'pinching hand', k: 'tiny small little pinch' },
      { e: '✌️', n: 'victory hand', k: 'peace victory two' },
      { e: '🤞', n: 'crossed fingers', k: 'luck hope crossing fingers' },
      { e: '🤟', n: 'love-you gesture', k: 'love ily rock' },
      { e: '🤘', n: 'sign of the horns', k: 'rock metal horns music' },
      { e: '🤙', n: 'call me hand', k: 'call hang loose shaka' },
      { e: '👈', n: 'backhand index pointing left', k: 'point left direction' },
      { e: '👉', n: 'backhand index pointing right', k: 'point right direction' },
      { e: '👆', n: 'backhand index pointing up', k: 'point up above' },
      { e: '🖕', n: 'middle finger', k: 'middle finger rude offensive' },
      { e: '👇', n: 'backhand index pointing down', k: 'point down below' },
      { e: '☝️', n: 'index pointing up', k: 'point up one idea' },
      { e: '👍', n: 'thumbs up', k: 'like approve good yes thumbs up' },
      { e: '👎', n: 'thumbs down', k: 'dislike no bad disagree thumbs down' },
      { e: '✊', n: 'raised fist', k: 'fist bump power solidarity' },
      { e: '👊', n: 'oncoming fist', k: 'fist punch bump' },
      { e: '🤛', n: 'left-facing fist', k: 'fist bump left' },
      { e: '🤜', n: 'right-facing fist', k: 'fist bump right' },
      { e: '👏', n: 'clapping hands', k: 'clap applause bravo congrats' },
      { e: '🙌', n: 'raising hands', k: 'celebrate hooray raise hands' },
      { e: '👐', n: 'open hands', k: 'open hug jazz hands' },
      { e: '🤲', n: 'palms up together', k: 'pray hands offering' },
      { e: '🤝', n: 'handshake', k: 'handshake deal agreement' },
      { e: '🙏', n: 'folded hands', k: 'pray please thank you namaste' },
      { e: '💅', n: 'nail polish', k: 'nails polish glamour fancy' },
      { e: '🤳', n: 'selfie', k: 'selfie photo camera phone' },
      { e: '💪', n: 'flexed biceps', k: 'muscle strong flex arm bicep' },
      { e: '🦾', n: 'mechanical arm', k: 'robot arm prosthetic strong' },
      { e: '🦵', n: 'leg', k: 'leg kick' },
      { e: '🦶', n: 'foot', k: 'foot kick' },
      { e: '👂', n: 'ear', k: 'ear hear listen' },
      { e: '👃', n: 'nose', k: 'nose smell' },
      { e: '🫀', n: 'anatomical heart', k: 'heart organ body' },
      { e: '🧠', n: 'brain', k: 'brain mind smart think' },
      { e: '👀', n: 'eyes', k: 'eyes see look watch' },
      { e: '👁️', n: 'eye', k: 'eye see look watch' },
      { e: '👅', n: 'tongue', k: 'tongue taste' },
      { e: '👄', n: 'mouth', k: 'mouth lips kiss' },
      { e: '🫦', n: 'biting lip', k: 'lip bite nervous flirty' },
      { e: '👶', n: 'baby', k: 'baby infant child newborn' },
      { e: '🧒', n: 'child', k: 'child kid young' },
      { e: '👦', n: 'boy', k: 'boy kid child male' },
      { e: '👧', n: 'girl', k: 'girl kid child female' },
      { e: '🧑', n: 'person', k: 'person adult human' },
      { e: '👱', n: 'person blond hair', k: 'blond person blonde' },
      { e: '👨', n: 'man', k: 'man male adult guy' },
      { e: '🧔', n: 'person beard', k: 'beard person man' },
      { e: '👩', n: 'woman', k: 'woman female adult lady' },
      { e: '🧓', n: 'older person', k: 'old elder senior' },
      { e: '👴', n: 'old man', k: 'old man grandfather senior' },
      { e: '👵', n: 'old woman', k: 'old woman grandmother senior' },
      { e: '🙍', n: 'person frowning', k: 'frown person sad' },
      { e: '🙎', n: 'person pouting', k: 'pout person mad' },
      { e: '🙅', n: 'person gesturing no', k: 'no stop arms cross' },
      { e: '🙆', n: 'person gesturing ok', k: 'ok arms circle' },
      { e: '💁', n: 'person tipping hand', k: 'info sassy helpful' },
      { e: '🙋', n: 'person raising hand', k: 'raise hand question volunteer' },
      { e: '🧏', n: 'deaf person', k: 'deaf hearing impaired' },
      { e: '🙇', n: 'person bowing', k: 'bow sorry respect' },
      { e: '🤦', n: 'person facepalming', k: 'facepalm disappointed ugh' },
      { e: '🤷', n: 'person shrugging', k: 'shrug dunno idk whatever' },
      { e: '👮', n: 'police officer', k: 'police officer cop law' },
      { e: '🕵️', n: 'detective', k: 'detective spy investigate' },
      { e: '💂', n: 'guard', k: 'guard royal soldier' },
      { e: '🧑‍⚕️', n: 'health worker', k: 'doctor nurse medical health' },
      { e: '👨‍🍳', n: 'cook', k: 'chef cook food kitchen' },
      { e: '🧑‍🎓', n: 'student', k: 'student graduate school' },
      { e: '🧑‍🎤', n: 'singer', k: 'singer music star performer' },
      { e: '🧑‍💻', n: 'technologist', k: 'programmer developer coder tech' },
      { e: '🧑‍🚀', n: 'astronaut', k: 'astronaut space rocket' },
      { e: '🧑‍🚒', n: 'firefighter', k: 'firefighter fire rescue' },
      { e: '👷', n: 'construction worker', k: 'worker construction builder' },
      { e: '🤴', n: 'prince', k: 'prince royal king' },
      { e: '👸', n: 'princess', k: 'princess royal queen' },
      { e: '🧙', n: 'mage', k: 'wizard witch magic mage' },
      { e: '🧝', n: 'elf', k: 'elf fantasy ears' },
      { e: '🧛', n: 'vampire', k: 'vampire blood halloween dracula' },
      { e: '🧟', n: 'zombie', k: 'zombie undead halloween' },
      { e: '🧞', n: 'genie', k: 'genie wish lamp magic' },
      { e: '🧜', n: 'merperson', k: 'mermaid merman sea fantasy' },
      { e: '🧚', n: 'fairy', k: 'fairy wings magic fantasy' },
      { e: '👼', n: 'baby angel', k: 'angel baby wings cute' },
      { e: '🎅', n: 'Santa Claus', k: 'santa christmas holiday' },
      { e: '🤶', n: 'Mrs. Claus', k: 'santa christmas mrs claus holiday' },
      { e: '🦸', n: 'superhero', k: 'hero superhero cape strong' },
      { e: '🦹', n: 'supervillain', k: 'villain evil cape' },
      { e: '🤺', n: 'person fencing', k: 'fencing sword sport' },
      { e: '🏇', n: 'horse racing', k: 'horse race jockey sport' },
      { e: '⛷️', n: 'skier', k: 'ski snow winter sport' },
      { e: '🏂', n: 'snowboarder', k: 'snowboard snow winter sport' },
    ],
  },
  {
    id: 'animals',
    label: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      { e: '🐶', n: 'dog face', k: 'dog pet animal puppy' },
      { e: '🐱', n: 'cat face', k: 'cat pet animal kitten' },
      { e: '🐭', n: 'mouse face', k: 'mouse rodent animal' },
      { e: '🐹', n: 'hamster', k: 'hamster rodent cute pet' },
      { e: '🐰', n: 'rabbit face', k: 'rabbit bunny animal cute' },
      { e: '🦊', n: 'fox', k: 'fox animal wild red' },
      { e: '🐻', n: 'bear', k: 'bear animal teddy' },
      { e: '🐼', n: 'panda', k: 'panda bear animal cute china' },
      { e: '🐨', n: 'koala', k: 'koala bear australia animal' },
      { e: '🐯', n: 'tiger face', k: 'tiger animal cat stripe' },
      { e: '🦁', n: 'lion', k: 'lion animal king jungle' },
      { e: '🐮', n: 'cow face', k: 'cow animal moo farm' },
      { e: '🐷', n: 'pig face', k: 'pig animal oink farm' },
      { e: '🐸', n: 'frog', k: 'frog animal amphibian green' },
      { e: '🐵', n: 'monkey face', k: 'monkey animal primate' },
      { e: '🙈', n: 'see-no-evil monkey', k: 'monkey no see evil cover eyes' },
      { e: '🙉', n: 'hear-no-evil monkey', k: 'monkey no hear evil' },
      { e: '🙊', n: 'speak-no-evil monkey', k: 'monkey no speak evil' },
      { e: '🐔', n: 'chicken', k: 'chicken bird animal farm' },
      { e: '🐧', n: 'penguin', k: 'penguin bird animal ice cold' },
      { e: '🐦', n: 'bird', k: 'bird animal fly tweet' },
      { e: '🐤', n: 'baby chick', k: 'chick baby bird yellow cute' },
      { e: '🦆', n: 'duck', k: 'duck bird animal water quack' },
      { e: '🦅', n: 'eagle', k: 'eagle bird animal prey' },
      { e: '🦉', n: 'owl', k: 'owl bird wise night' },
      { e: '🦇', n: 'bat', k: 'bat animal night halloween' },
      { e: '🐺', n: 'wolf', k: 'wolf animal wild howl' },
      { e: '🐗', n: 'boar', k: 'boar pig wild animal' },
      { e: '🐴', n: 'horse face', k: 'horse animal farm riding' },
      { e: '🦄', n: 'unicorn', k: 'unicorn magic horse fantasy' },
      { e: '🐝', n: 'honeybee', k: 'bee honey insect flower' },
      { e: '🐛', n: 'bug', k: 'bug caterpillar insect worm' },
      { e: '🦋', n: 'butterfly', k: 'butterfly insect beautiful transform' },
      { e: '🐌', n: 'snail', k: 'snail slow shell' },
      { e: '🐞', n: 'lady beetle', k: 'ladybug ladybird beetle insect' },
      { e: '🐜', n: 'ant', k: 'ant insect bug tiny' },
      { e: '🦟', n: 'mosquito', k: 'mosquito bug bite' },
      { e: '🦗', n: 'cricket', k: 'cricket insect chirp' },
      { e: '🦂', n: 'scorpion', k: 'scorpion sting desert' },
      { e: '🐢', n: 'turtle', k: 'turtle slow animal reptile shell' },
      { e: '🐍', n: 'snake', k: 'snake reptile slither' },
      { e: '🦎', n: 'lizard', k: 'lizard reptile animal' },
      { e: '🦖', n: 'T-Rex', k: 'dinosaur trex rex big' },
      { e: '🦕', n: 'sauropod', k: 'dinosaur long neck brontosaurus' },
      { e: '🐙', n: 'octopus', k: 'octopus sea tentacles' },
      { e: '🦑', n: 'squid', k: 'squid sea animal ink' },
      { e: '🦐', n: 'shrimp', k: 'shrimp sea food small' },
      { e: '🦞', n: 'lobster', k: 'lobster sea food red' },
      { e: '🦀', n: 'crab', k: 'crab sea food sideways' },
      { e: '🐡', n: 'blowfish', k: 'blowfish fish puffer sea' },
      { e: '🐠', n: 'tropical fish', k: 'fish tropical sea colorful' },
      { e: '🐟', n: 'fish', k: 'fish sea swim water' },
      { e: '🐬', n: 'dolphin', k: 'dolphin sea smart mammal' },
      { e: '🐳', n: 'spouting whale', k: 'whale sea big mammal' },
      { e: '🦈', n: 'shark', k: 'shark sea danger predator' },
      { e: '🐊', n: 'crocodile', k: 'crocodile reptile alligator' },
      { e: '🐆', n: 'leopard', k: 'leopard cat spots wild' },
      { e: '🐅', n: 'tiger', k: 'tiger animal stripe jungle' },
      { e: '🐃', n: 'water buffalo', k: 'buffalo animal farm' },
      { e: '🦍', n: 'gorilla', k: 'gorilla ape monkey strong' },
      { e: '🦧', n: 'orangutan', k: 'orangutan ape monkey' },
      { e: '🦬', n: 'bison', k: 'bison buffalo wild' },
      { e: '🐘', n: 'elephant', k: 'elephant big animal trunk' },
      { e: '🦛', n: 'hippopotamus', k: 'hippo animal water big' },
      { e: '🦒', n: 'giraffe', k: 'giraffe tall animal neck' },
      { e: '🦓', n: 'zebra', k: 'zebra stripe animal africa' },
      { e: '🦏', n: 'rhinoceros', k: 'rhino horn animal africa' },
      { e: '🦙', n: 'llama', k: 'llama animal wool' },
      { e: '🦘', n: 'kangaroo', k: 'kangaroo australia jump' },
      { e: '🦔', n: 'hedgehog', k: 'hedgehog spiny cute animal' },
      { e: '🐓', n: 'rooster', k: 'rooster chicken cock farm' },
      { e: '🦚', n: 'peacock', k: 'peacock bird colorful beautiful' },
      { e: '🦜', n: 'parrot', k: 'parrot bird colorful talk' },
      { e: '🦢', n: 'swan', k: 'swan bird graceful white' },
      { e: '🦩', n: 'flamingo', k: 'flamingo pink bird' },
      { e: '🕊️', n: 'dove', k: 'dove peace bird white' },
      { e: '🐇', n: 'rabbit', k: 'rabbit bunny white hop' },
      { e: '🦝', n: 'raccoon', k: 'raccoon trash mask animal' },
      { e: '🦨', n: 'skunk', k: 'skunk smell stinky animal' },
      { e: '🦡', n: 'badger', k: 'badger animal nocturnal' },
      { e: '🦦', n: 'otter', k: 'otter water cute swim' },
      { e: '🦥', n: 'sloth', k: 'sloth slow hang tree' },
      { e: '🐿️', n: 'chipmunk', k: 'chipmunk squirrel nuts acorn' },
      { e: '🦔', n: 'hedgehog', k: 'hedgehog spiny cute' },
      { e: '🌸', n: 'cherry blossom', k: 'flower pink spring japan' },
      { e: '🌺', n: 'hibiscus', k: 'flower tropical red' },
      { e: '🌹', n: 'rose', k: 'rose flower red love romantic' },
      { e: '🌻', n: 'sunflower', k: 'sunflower yellow bright summer' },
      { e: '🌼', n: 'blossom', k: 'flower yellow bloom spring' },
      { e: '🌷', n: 'tulip', k: 'tulip flower spring pink' },
      { e: '🍀', n: 'four leaf clover', k: 'clover luck lucky green' },
      { e: '🌿', n: 'herb', k: 'herb plant green leaf' },
      { e: '🌱', n: 'seedling', k: 'plant growth seedling new' },
      { e: '🌾', n: 'sheaf of rice', k: 'rice wheat grain harvest' },
      { e: '🍄', n: 'mushroom', k: 'mushroom fungi food nature' },
      { e: '🌵', n: 'cactus', k: 'cactus desert plant prickle' },
      { e: '🌴', n: 'palm tree', k: 'palm tropical beach summer' },
      { e: '🌳', n: 'deciduous tree', k: 'tree nature wood' },
      { e: '🌲', n: 'evergreen tree', k: 'tree pine christmas' },
      { e: '🍁', n: 'maple leaf', k: 'maple leaf autumn fall canada' },
      { e: '🍂', n: 'fallen leaf', k: 'leaf autumn fall' },
      { e: '🍃', n: 'leaf fluttering', k: 'leaf green wind flutter' },
      { e: '🌊', n: 'water wave', k: 'wave water ocean sea surf' },
      { e: '🌈', n: 'rainbow', k: 'rainbow colorful pride hope' },
      { e: '🌙', n: 'crescent moon', k: 'moon night crescent sleep' },
      { e: '⭐', n: 'star', k: 'star bright shine favorite' },
      { e: '🌟', n: 'glowing star', k: 'star glow shine sparkle' },
      { e: '✨', n: 'sparkles', k: 'sparkle star magic twinkle' },
      { e: '⚡', n: 'lightning', k: 'lightning electric flash thunder' },
      { e: '🔥', n: 'fire', k: 'fire flame hot burn' },
      { e: '💧', n: 'droplet', k: 'water drop tear blue' },
      { e: '❄️', n: 'snowflake', k: 'snow cold winter ice' },
      { e: '☀️', n: 'sun', k: 'sun sunny warm bright day' },
      { e: '🌤️', n: 'sun behind cloud', k: 'cloud partly sunny weather' },
      { e: '⛅', n: 'sun behind cloud', k: 'cloudy partly sunny' },
      { e: '🌧️', n: 'rain', k: 'rain cloud wet weather' },
      { e: '⛈️', n: 'thunder', k: 'thunder storm lightning rain' },
      { e: '🌪️', n: 'tornado', k: 'tornado wind twister storm' },
      { e: '🌈', n: 'rainbow', k: 'rainbow color arch beautiful' },
      { e: '🌍', n: 'earth globe Europe-Africa', k: 'earth world globe planet' },
      { e: '🌎', n: 'earth globe Americas', k: 'earth world globe planet' },
      { e: '🌏', n: 'earth globe Asia-Australia', k: 'earth world globe planet asia' },
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: '🍎',
    emojis: [
      { e: '🍎', n: 'red apple', k: 'apple fruit red food' },
      { e: '🍊', n: 'tangerine', k: 'orange tangerine citrus fruit' },
      { e: '🍋', n: 'lemon', k: 'lemon citrus yellow sour' },
      { e: '🍇', n: 'grapes', k: 'grapes fruit purple bunch' },
      { e: '🍓', n: 'strawberry', k: 'strawberry fruit red sweet' },
      { e: '🍒', n: 'cherries', k: 'cherries fruit red sweet' },
      { e: '🍑', n: 'peach', k: 'peach fruit soft' },
      { e: '🥭', n: 'mango', k: 'mango tropical fruit' },
      { e: '🍍', n: 'pineapple', k: 'pineapple tropical fruit' },
      { e: '🥥', n: 'coconut', k: 'coconut tropical fruit' },
      { e: '🥝', n: 'kiwi fruit', k: 'kiwi green fruit' },
      { e: '🍅', n: 'tomato', k: 'tomato red fruit vegetable' },
      { e: '🍆', n: 'eggplant', k: 'eggplant aubergine purple vegetable' },
      { e: '🥑', n: 'avocado', k: 'avocado green food healthy' },
      { e: '🫑', n: 'bell pepper', k: 'pepper vegetable capsicum' },
      { e: '🌽', n: 'ear of corn', k: 'corn maize vegetable yellow' },
      { e: '🌶️', n: 'hot pepper', k: 'chili pepper spicy hot red' },
      { e: '🥕', n: 'carrot', k: 'carrot vegetable orange rabbit' },
      { e: '🧅', n: 'onion', k: 'onion vegetable cry layers' },
      { e: '🧄', n: 'garlic', k: 'garlic spice vegetable' },
      { e: '🥔', n: 'potato', k: 'potato vegetable starchy' },
      { e: '🍞', n: 'bread', k: 'bread loaf food bake' },
      { e: '🥐', n: 'croissant', k: 'croissant bread french bake' },
      { e: '🥖', n: 'baguette', k: 'baguette french bread' },
      { e: '🫓', n: 'flatbread', k: 'flatbread pita bread' },
      { e: '🧀', n: 'cheese wedge', k: 'cheese dairy yellow' },
      { e: '🥚', n: 'egg', k: 'egg breakfast food white' },
      { e: '🍳', n: 'cooking', k: 'frying pan egg breakfast cook' },
      { e: '🥞', n: 'pancakes', k: 'pancakes breakfast stack syrup' },
      { e: '🧇', n: 'waffle', k: 'waffle breakfast crispy' },
      { e: '🥓', n: 'bacon', k: 'bacon pork breakfast meat' },
      { e: '🌭', n: 'hot dog', k: 'hotdog sausage fast food' },
      { e: '🍔', n: 'hamburger', k: 'burger hamburger fast food beef' },
      { e: '🍟', n: 'french fries', k: 'fries potato fast food' },
      { e: '🍕', n: 'pizza', k: 'pizza italian food cheese' },
      { e: '🌮', n: 'taco', k: 'taco mexican food shell' },
      { e: '🌯', n: 'burrito', k: 'burrito wrap mexican food' },
      { e: '🫔', n: 'tamale', k: 'tamale mexican food corn' },
      { e: '🥙', n: 'stuffed flatbread', k: 'gyro wrap flatbread middle east' },
      { e: '🧆', n: 'falafel', k: 'falafel middle east chickpea' },
      { e: '🥗', n: 'green salad', k: 'salad healthy green food' },
      { e: '🥘', n: 'shallow pan of food', k: 'paella pan food stew' },
      { e: '🍲', n: 'pot of food', k: 'stew soup pot food' },
      { e: '🍜', n: 'steaming bowl', k: 'noodles ramen soup noodle' },
      { e: '🍝', n: 'spaghetti', k: 'pasta spaghetti italian' },
      { e: '🍛', n: 'curry rice', k: 'curry rice spicy indian' },
      { e: '🍣', n: 'sushi', k: 'sushi japanese rice fish' },
      { e: '🍱', n: 'bento box', k: 'bento japanese lunch box' },
      { e: '🍙', n: 'rice ball', k: 'onigiri rice ball japanese' },
      { e: '🍚', n: 'cooked rice', k: 'rice bowl asian food' },
      { e: '🍤', n: 'fried shrimp', k: 'shrimp fried tempura seafood' },
      { e: '🍡', n: 'dango', k: 'dango japanese sweet skewer' },
      { e: '🧁', n: 'cupcake', k: 'cupcake cake sweet dessert' },
      { e: '🍰', n: 'shortcake', k: 'cake slice dessert sweet' },
      { e: '🎂', n: 'birthday cake', k: 'birthday cake celebrate candle' },
      { e: '🍮', n: 'custard', k: 'custard pudding dessert' },
      { e: '🍭', n: 'lollipop', k: 'lollipop candy sweet stick' },
      { e: '🍬', n: 'candy', k: 'candy sweet wrapper' },
      { e: '🍫', n: 'chocolate bar', k: 'chocolate sweet dessert' },
      { e: '🍩', n: 'doughnut', k: 'donut doughnut sweet ring' },
      { e: '🍪', n: 'cookie', k: 'cookie sweet biscuit' },
      { e: '🍿', n: 'popcorn', k: 'popcorn movie snack cinema' },
      { e: '🧂', n: 'salt', k: 'salt seasoning shaker' },
      { e: '🍯', n: 'honey pot', k: 'honey sweet bee jar' },
      { e: '☕', n: 'hot beverage', k: 'coffee tea hot drink morning' },
      { e: '🍵', n: 'teacup', k: 'tea cup green hot drink' },
      { e: '🧋', n: 'bubble tea', k: 'bubble tea boba milk tea' },
      { e: '🥤', n: 'cup with straw', k: 'drink soda cup straw' },
      { e: '🧃', n: 'beverage box', k: 'juice box drink' },
      { e: '🍺', n: 'beer mug', k: 'beer drink pub cheers mug' },
      { e: '🍻', n: 'clinking beer mugs', k: 'beer cheers toast drink' },
      { e: '🥂', n: 'clinking glasses', k: 'champagne toast cheers celebrate' },
      { e: '🍷', n: 'wine glass', k: 'wine red drink glass' },
      { e: '🥃', n: 'tumbler glass', k: 'whiskey bourbon glass drink' },
      { e: '🍸', n: 'cocktail glass', k: 'cocktail martini drink bar' },
      { e: '🍹', n: 'tropical drink', k: 'cocktail tropical drink beach' },
      { e: '🧊', n: 'ice cube', k: 'ice cold cube frozen' },
      { e: '🍾', n: 'bottle with popping cork', k: 'champagne celebrate party bottle' },
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    icon: '✈️',
    emojis: [
      { e: '🚗', n: 'automobile', k: 'car vehicle drive road' },
      { e: '🚕', n: 'taxi', k: 'taxi cab yellow ride' },
      { e: '🚙', n: 'sport utility vehicle', k: 'car suv vehicle' },
      { e: '🚌', n: 'bus', k: 'bus public transport school' },
      { e: '🏎️', n: 'racing car', k: 'race car fast sports' },
      { e: '🚓', n: 'police car', k: 'police car cop law' },
      { e: '🚑', n: 'ambulance', k: 'ambulance emergency medical' },
      { e: '🚒', n: 'fire engine', k: 'fire truck engine red' },
      { e: '🛻', n: 'pickup truck', k: 'truck pickup vehicle' },
      { e: '🚚', n: 'delivery truck', k: 'truck delivery lorry' },
      { e: '🚛', n: 'articulated lorry', k: 'truck semi cargo' },
      { e: '🚲', n: 'bicycle', k: 'bike bicycle cycle pedal' },
      { e: '🛴', n: 'kick scooter', k: 'scooter kick ride' },
      { e: '🛵', n: 'motor scooter', k: 'scooter moped vespa' },
      { e: '🏍️', n: 'motorcycle', k: 'motorcycle motorbike ride' },
      { e: '🚢', n: 'ship', k: 'ship cruise ocean sea voyage' },
      { e: '⛵', n: 'sailboat', k: 'sail boat yacht sea wind' },
      { e: '🚤', n: 'speedboat', k: 'speedboat fast water' },
      { e: '✈️', n: 'airplane', k: 'airplane flight travel fly' },
      { e: '🚁', n: 'helicopter', k: 'helicopter fly rotor' },
      { e: '🛸', n: 'flying saucer', k: 'ufo alien space saucer' },
      { e: '🚀', n: 'rocket', k: 'rocket space launch fast' },
      { e: '🛩️', n: 'small airplane', k: 'plane small fly light' },
      { e: '🛶', n: 'canoe', k: 'canoe kayak paddle water' },
      { e: '🛺', n: 'auto rickshaw', k: 'rickshaw tuk-tuk asia' },
      { e: '🚂', n: 'locomotive', k: 'train locomotive steam rail' },
      { e: '🚃', n: 'railway car', k: 'train car rail transport' },
      { e: '🚄', n: 'high-speed train', k: 'bullet train shinkansen fast' },
      { e: '🚇', n: 'metro', k: 'metro subway underground city' },
      { e: '🚉', n: 'station', k: 'train station rail' },
      { e: '🛣️', n: 'motorway', k: 'highway road motorway' },
      { e: '⛽', n: 'fuel pump', k: 'gas fuel petrol pump station' },
      { e: '⚓', n: 'anchor', k: 'anchor ship sea port' },
      { e: '🗺️', n: 'world map', k: 'map world travel navigate' },
      { e: '🧭', n: 'compass', k: 'compass navigate direction' },
      { e: '🏔️', n: 'snow-capped mountain', k: 'mountain snow peak alpine' },
      { e: '🌋', n: 'volcano', k: 'volcano lava erupt mountain' },
      { e: '🏕️', n: 'camping', k: 'camp tent outdoor nature' },
      { e: '🏖️', n: 'beach', k: 'beach sand sun summer holiday' },
      { e: '🏜️', n: 'desert', k: 'desert sand hot dry' },
      { e: '🏝️', n: 'desert island', k: 'island tropical beach palm' },
      { e: '🏠', n: 'house', k: 'house home building' },
      { e: '🏡', n: 'house with garden', k: 'house garden home' },
      { e: '🏢', n: 'office building', k: 'office building work city' },
      { e: '🏥', n: 'hospital', k: 'hospital medical health building' },
      { e: '🏦', n: 'bank', k: 'bank money building finance' },
      { e: '🏨', n: 'hotel', k: 'hotel travel stay building' },
      { e: '🏪', n: 'convenience store', k: 'store shop convenience' },
      { e: '🏫', n: 'school', k: 'school education building' },
      { e: '🏛️', n: 'classical building', k: 'museum government classical columns' },
      { e: '🕌', n: 'mosque', k: 'mosque islam prayer building' },
      { e: '⛩️', n: 'shinto shrine', k: 'shrine japan torii gate' },
      { e: '🕍', n: 'synagogue', k: 'synagogue jewish temple' },
      { e: '⛪', n: 'church', k: 'church christian building' },
      { e: '🗼', n: 'Tokyo tower', k: 'tokyo tower japan landmark' },
      { e: '🗽', n: 'Statue of Liberty', k: 'statue liberty new york usa' },
      { e: '🏰', n: 'European castle', k: 'castle europe kingdom' },
      { e: '🏯', n: 'Japanese castle', k: 'castle japan shrine' },
      { e: '🌃', n: 'night with stars', k: 'city night stars dark' },
      { e: '🌆', n: 'cityscape at dusk', k: 'city dusk evening sunset' },
      { e: '🌇', n: 'sunset', k: 'sunset city dusk evening' },
      { e: '🌉', n: 'bridge at night', k: 'bridge night city light' },
      { e: '🎠', n: 'carousel horse', k: 'carousel ride merry-go-round' },
      { e: '🎡', n: 'ferris wheel', k: 'ferris wheel carnival fair' },
      { e: '🎢', n: 'roller coaster', k: 'rollercoaster ride thrill' },
      { e: '🎪', n: 'circus tent', k: 'circus tent fair carnival' },
      { e: '🗾', n: 'map of Japan', k: 'japan map country' },
      { e: '🌐', n: 'globe with meridians', k: 'globe world internet web' },
      { e: '🗓️', n: 'spiral calendar', k: 'calendar date schedule' },
    ],
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: '⚽',
    emojis: [
      { e: '⚽', n: 'soccer ball', k: 'soccer football sport ball' },
      { e: '🏀', n: 'basketball', k: 'basketball sport ball hoop' },
      { e: '🏈', n: 'american football', k: 'football american sport' },
      { e: '⚾', n: 'baseball', k: 'baseball sport ball bat' },
      { e: '🥎', n: 'softball', k: 'softball sport' },
      { e: '🎾', n: 'tennis', k: 'tennis sport racket' },
      { e: '🏐', n: 'volleyball', k: 'volleyball sport net' },
      { e: '🏉', n: 'rugby football', k: 'rugby sport oval' },
      { e: '🥏', n: 'flying disc', k: 'frisbee disc throw sport' },
      { e: '🎱', n: 'pool 8 ball', k: 'billiard pool 8ball snooker' },
      { e: '🏓', n: 'ping pong', k: 'table tennis ping pong sport' },
      { e: '🏸', n: 'badminton', k: 'badminton shuttle racket sport' },
      { e: '🏒', n: 'ice hockey', k: 'hockey ice stick puck' },
      { e: '🏑', n: 'field hockey', k: 'hockey field stick grass' },
      { e: '🥊', n: 'boxing glove', k: 'boxing glove fight sport' },
      { e: '🥋', n: 'martial arts uniform', k: 'karate judo martial arts' },
      { e: '🎽', n: 'running shirt', k: 'shirt race running sport' },
      { e: '⛷️', n: 'skier', k: 'ski snow winter sport' },
      { e: '🏂', n: 'snowboarder', k: 'snowboard winter sport' },
      { e: '🏋️', n: 'person lifting weights', k: 'weightlift gym barbell strong' },
      { e: '🤼', n: 'people wrestling', k: 'wrestling sport fight' },
      { e: '🤸', n: 'person cartwheeling', k: 'cartwheel gymnastics sport' },
      { e: '⛹️', n: 'person bouncing ball', k: 'basketball bounce sport' },
      { e: '🤺', n: 'person fencing', k: 'fencing sword sport' },
      { e: '🏇', n: 'horse racing', k: 'horse racing jockey sport' },
      { e: '🏊', n: 'person swimming', k: 'swim pool sport water' },
      { e: '🤽', n: 'person playing water polo', k: 'water polo sport swim' },
      { e: '🚴', n: 'person cycling', k: 'cycling bike sport pedal' },
      { e: '🏆', n: 'trophy', k: 'trophy win champion award' },
      { e: '🥇', n: 'gold medal', k: 'gold medal first winner' },
      { e: '🥈', n: 'silver medal', k: 'silver medal second' },
      { e: '🥉', n: 'bronze medal', k: 'bronze medal third' },
      { e: '🎖️', n: 'military medal', k: 'medal military honor' },
      { e: '🏅', n: 'sports medal', k: 'medal sports award win' },
      { e: '🎮', n: 'video game', k: 'game controller video gaming' },
      { e: '🕹️', n: 'joystick', k: 'joystick game arcade' },
      { e: '🎲', n: 'game die', k: 'dice game random chance' },
      { e: '♟️', n: 'chess pawn', k: 'chess pawn game strategy' },
      { e: '🎯', n: 'direct hit', k: 'target bullseye dart aim' },
      { e: '🎳', n: 'bowling', k: 'bowling pins strike sport' },
      { e: '🎰', n: 'slot machine', k: 'slot machine casino gamble' },
      { e: '🧩', n: 'puzzle piece', k: 'puzzle jigsaw piece fit' },
      { e: '🎭', n: 'performing arts', k: 'theater drama comedy tragedy' },
      { e: '🎨', n: 'artist palette', k: 'art paint palette artist' },
      { e: '🎬', n: 'clapper board', k: 'movie film action director' },
      { e: '🎤', n: 'microphone', k: 'mic microphone sing karaoke' },
      { e: '🎧', n: 'headphone', k: 'headphones music listen audio' },
      { e: '🎵', n: 'musical note', k: 'music note song' },
      { e: '🎶', n: 'musical notes', k: 'music notes song melody' },
      { e: '🎸', n: 'guitar', k: 'guitar music rock instrument' },
      { e: '🎺', n: 'trumpet', k: 'trumpet music brass instrument' },
      { e: '🎻', n: 'violin', k: 'violin music strings instrument' },
      { e: '🥁', n: 'drum', k: 'drum music beat percussion' },
      { e: '🎷', n: 'saxophone', k: 'saxophone sax music jazz' },
      { e: '🎼', n: 'musical score', k: 'music sheet score notes' },
      { e: '🎹', n: 'musical keyboard', k: 'piano keyboard music instrument' },
      { e: '🪘', n: 'long drum', k: 'drum music conga bongo' },
      { e: '🎙️', n: 'studio microphone', k: 'mic microphone podcast record' },
      { e: '📻', n: 'radio', k: 'radio music listen broadcast' },
      { e: '🎥', n: 'movie camera', k: 'camera film movie record' },
      { e: '🎞️', n: 'film frames', k: 'film movie cinema frames' },
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: '💡',
    emojis: [
      { e: '📱', n: 'mobile phone', k: 'phone mobile cell smartphone' },
      { e: '💻', n: 'laptop', k: 'laptop computer notebook tech' },
      { e: '⌨️', n: 'keyboard', k: 'keyboard type computer' },
      { e: '🖥️', n: 'desktop computer', k: 'desktop computer monitor screen' },
      { e: '🖨️', n: 'printer', k: 'printer print paper' },
      { e: '🖱️', n: 'computer mouse', k: 'mouse click computer' },
      { e: '💾', n: 'floppy disk', k: 'floppy disk save storage old' },
      { e: '💿', n: 'optical disk', k: 'cd disc music data' },
      { e: '📀', n: 'dvd', k: 'dvd disc movie data' },
      { e: '📷', n: 'camera', k: 'camera photo picture shot' },
      { e: '📸', n: 'camera with flash', k: 'camera photo flash selfie' },
      { e: '📹', n: 'video camera', k: 'video camera record film' },
      { e: '📺', n: 'television', k: 'tv television watch screen' },
      { e: '☎️', n: 'telephone', k: 'phone call old telephone' },
      { e: '📟', n: 'pager', k: 'pager beeper old' },
      { e: '💡', n: 'light bulb', k: 'idea lightbulb bright think' },
      { e: '🔦', n: 'flashlight', k: 'flashlight torch light dark' },
      { e: '🕯️', n: 'candle', k: 'candle flame light romantic' },
      { e: '🧯', n: 'fire extinguisher', k: 'fire extinguisher emergency' },
      { e: '💊', n: 'pill', k: 'pill medicine drug tablet' },
      { e: '💉', n: 'syringe', k: 'syringe needle inject vaccine' },
      { e: '🩺', n: 'stethoscope', k: 'stethoscope doctor medical' },
      { e: '🩹', n: 'adhesive bandage', k: 'bandage plaster wound heal' },
      { e: '🔬', n: 'microscope', k: 'microscope science lab research' },
      { e: '🔭', n: 'telescope', k: 'telescope star space astronomy' },
      { e: '🧪', n: 'test tube', k: 'test tube science experiment lab' },
      { e: '🧫', n: 'petri dish', k: 'petri dish culture science' },
      { e: '🧬', n: 'dna', k: 'dna gene biology science' },
      { e: '🔮', n: 'crystal ball', k: 'crystal ball magic future predict' },
      { e: '🔒', n: 'locked', k: 'lock secure locked closed' },
      { e: '🔓', n: 'unlocked', k: 'unlock open unsecured' },
      { e: '🔑', n: 'key', k: 'key lock access open' },
      { e: '🗝️', n: 'old key', k: 'key old vintage access' },
      { e: '🔨', n: 'hammer', k: 'hammer tool hit build' },
      { e: '⛏️', n: 'pick', k: 'pickaxe mine dig tool' },
      { e: '⚒️', n: 'hammer and pick', k: 'tools work craft' },
      { e: '🛠️', n: 'hammer and wrench', k: 'tools repair fix build' },
      { e: '🔧', n: 'wrench', k: 'wrench tool fix repair' },
      { e: '🔩', n: 'nut and bolt', k: 'bolt nut screw fastener' },
      { e: '⚙️', n: 'gear', k: 'gear settings cog machine' },
      { e: '🗜️', n: 'clamp', k: 'clamp tool grip' },
      { e: '⚖️', n: 'balance scale', k: 'scale balance justice law' },
      { e: '🔗', n: 'link', k: 'link chain connect url' },
      { e: '⛓️', n: 'chains', k: 'chain linked bound' },
      { e: '🧲', n: 'magnet', k: 'magnet attract pull magnetic' },
      { e: '🪜', n: 'ladder', k: 'ladder climb steps' },
      { e: '🧰', n: 'toolbox', k: 'toolbox tools kit repair' },
      { e: '📦', n: 'package', k: 'box package ship delivery' },
      { e: '📋', n: 'clipboard', k: 'clipboard list document' },
      { e: '📌', n: 'pushpin', k: 'pin pushpin attach mark' },
      { e: '📍', n: 'round pushpin', k: 'pin location mark place' },
      { e: '✂️', n: 'scissors', k: 'scissors cut trim snip' },
      { e: '📁', n: 'file folder', k: 'folder file directory' },
      { e: '📂', n: 'open file folder', k: 'folder open file' },
      { e: '📜', n: 'scroll', k: 'scroll parchment old document' },
      { e: '📄', n: 'page facing up', k: 'document page paper' },
      { e: '📝', n: 'memo', k: 'memo note write document' },
      { e: '✏️', n: 'pencil', k: 'pencil write draw edit' },
      { e: '🖊️', n: 'pen', k: 'pen write ink' },
      { e: '🖋️', n: 'fountain pen', k: 'pen fountain write ink fancy' },
      { e: '🖌️', n: 'paintbrush', k: 'paintbrush art paint brush' },
      { e: '🔍', n: 'magnifying glass tilted left', k: 'search magnify zoom find' },
      { e: '🔎', n: 'magnifying glass tilted right', k: 'search magnify zoom find' },
      { e: '📏', n: 'straight ruler', k: 'ruler measure straight' },
      { e: '📐', n: 'triangular ruler', k: 'ruler triangle measure' },
      { e: '🧮', n: 'abacus', k: 'abacus calculator count math' },
      { e: '📊', n: 'bar chart', k: 'chart graph bar data' },
      { e: '📈', n: 'chart increasing', k: 'chart up growth profit' },
      { e: '📉', n: 'chart decreasing', k: 'chart down decrease loss' },
      { e: '🗃️', n: 'card file box', k: 'file box cards archive' },
      { e: '🗑️', n: 'wastebasket', k: 'trash bin delete waste' },
      { e: '📬', n: 'open mailbox', k: 'mail mailbox letter post' },
      { e: '📮', n: 'postbox', k: 'post box mail letter' },
      { e: '✉️', n: 'envelope', k: 'email letter mail envelope' },
      { e: '📧', n: 'e-mail', k: 'email mail message internet' },
      { e: '💬', n: 'speech bubble', k: 'chat message speech bubble talk' },
      { e: '💭', n: 'thought balloon', k: 'thought think bubble' },
      { e: '🔔', n: 'bell', k: 'bell notification ring alert' },
      { e: '🔕', n: 'bell with slash', k: 'bell mute silent notification' },
      { e: '📣', n: 'megaphone', k: 'megaphone loud announce cheer' },
      { e: '📢', n: 'loudspeaker', k: 'speaker announce broadcast' },
      { e: '🏷️', n: 'label', k: 'label tag price' },
      { e: '🎁', n: 'wrapped gift', k: 'gift present birthday surprise' },
      { e: '🎀', n: 'ribbon', k: 'ribbon bow present gift' },
      { e: '🎊', n: 'confetti ball', k: 'confetti party celebrate' },
      { e: '🎉', n: 'party popper', k: 'party celebrate tada congrats' },
      { e: '🎈', n: 'balloon', k: 'balloon party birthday' },
      { e: '🕰️', n: 'mantelpiece clock', k: 'clock time vintage antique' },
      { e: '⏰', n: 'alarm clock', k: 'alarm clock wake time' },
      { e: '⌚', n: 'watch', k: 'watch time wristwatch' },
      { e: '⏱️', n: 'stopwatch', k: 'stopwatch timer count' },
      { e: '🎒', n: 'backpack', k: 'backpack bag school travel' },
      { e: '👜', n: 'handbag', k: 'bag purse handbag fashion' },
      { e: '💼', n: 'briefcase', k: 'briefcase work business' },
      { e: '👓', n: 'glasses', k: 'glasses spectacles see vision' },
      { e: '🕶️', n: 'sunglasses', k: 'sunglasses cool shades' },
      { e: '🔋', n: 'battery', k: 'battery power energy charge' },
      { e: '🔌', n: 'electric plug', k: 'plug power electric outlet' },
      { e: '💡', n: 'light bulb', k: 'bulb idea bright light' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    icon: '❤️',
    emojis: [
      { e: '❤️', n: 'red heart', k: 'heart love red romance' },
      { e: '🧡', n: 'orange heart', k: 'heart orange love' },
      { e: '💛', n: 'yellow heart', k: 'heart yellow love' },
      { e: '💚', n: 'green heart', k: 'heart green love nature' },
      { e: '💙', n: 'blue heart', k: 'heart blue love' },
      { e: '💜', n: 'purple heart', k: 'heart purple love' },
      { e: '🖤', n: 'black heart', k: 'heart black dark love' },
      { e: '🤍', n: 'white heart', k: 'heart white pure love' },
      { e: '🤎', n: 'brown heart', k: 'heart brown earthy love' },
      { e: '💔', n: 'broken heart', k: 'broken heart sad breakup' },
      { e: '❣️', n: 'heart exclamation', k: 'heart exclamation love' },
      { e: '💕', n: 'two hearts', k: 'hearts two love romance' },
      { e: '💞', n: 'revolving hearts', k: 'hearts revolving love' },
      { e: '💓', n: 'beating heart', k: 'heart beat pulse love' },
      { e: '💗', n: 'growing heart', k: 'heart grow love' },
      { e: '💖', n: 'sparkling heart', k: 'heart sparkle love' },
      { e: '💘', n: 'heart with arrow', k: 'heart arrow love cupid' },
      { e: '💝', n: 'heart with ribbon', k: 'heart ribbon gift love' },
      { e: '💟', n: 'heart decoration', k: 'heart decoration love' },
      { e: '☮️', n: 'peace symbol', k: 'peace symbol dove harmony' },
      { e: '✝️', n: 'cross', k: 'cross christian religion' },
      { e: '☯️', n: 'yin yang', k: 'yin yang balance harmony' },
      { e: '✡️', n: 'star of David', k: 'star david jewish religion' },
      { e: '🕎', n: 'menorah', k: 'menorah jewish hanukkah' },
      { e: '☪️', n: 'star and crescent', k: 'islam crescent moon religion' },
      { e: '🔯', n: 'dotted six-pointed star', k: 'star jewish religion' },
      { e: '♈', n: 'Aries', k: 'aries zodiac horoscope ram' },
      { e: '♉', n: 'Taurus', k: 'taurus zodiac bull horoscope' },
      { e: '♊', n: 'Gemini', k: 'gemini zodiac twins horoscope' },
      { e: '♋', n: 'Cancer', k: 'cancer zodiac crab horoscope' },
      { e: '♌', n: 'Leo', k: 'leo zodiac lion horoscope' },
      { e: '♍', n: 'Virgo', k: 'virgo zodiac horoscope' },
      { e: '♎', n: 'Libra', k: 'libra zodiac scales horoscope' },
      { e: '♏', n: 'Scorpius', k: 'scorpio zodiac scorpion horoscope' },
      { e: '♐', n: 'Sagittarius', k: 'sagittarius zodiac horoscope' },
      { e: '♑', n: 'Capricorn', k: 'capricorn zodiac goat horoscope' },
      { e: '♒', n: 'Aquarius', k: 'aquarius zodiac water horoscope' },
      { e: '♓', n: 'Pisces', k: 'pisces zodiac fish horoscope' },
      { e: '⛎', n: 'Ophiuchus', k: 'ophiuchus zodiac' },
      { e: '🔀', n: 'shuffle tracks', k: 'shuffle random music' },
      { e: '🔁', n: 'repeat button', k: 'repeat loop cycle' },
      { e: '🔂', n: 'repeat single', k: 'repeat once loop' },
      { e: '▶️', n: 'play button', k: 'play start media' },
      { e: '⏩', n: 'fast-forward', k: 'fast forward skip' },
      { e: '⏪', n: 'fast reverse', k: 'rewind back skip' },
      { e: '⏫', n: 'fast up', k: 'fast up skip' },
      { e: '⏬', n: 'fast down', k: 'fast down' },
      { e: '⏮️', n: 'previous track', k: 'previous back track' },
      { e: '⏭️', n: 'next track', k: 'next forward track' },
      { e: '⏹️', n: 'stop button', k: 'stop halt' },
      { e: '⏺️', n: 'record button', k: 'record red dot' },
      { e: '⏏️', n: 'eject button', k: 'eject disc' },
      { e: '🔇', n: 'muted speaker', k: 'mute silent no sound' },
      { e: '🔈', n: 'speaker low', k: 'volume low quiet' },
      { e: '🔉', n: 'speaker medium', k: 'volume medium sound' },
      { e: '🔊', n: 'speaker high', k: 'volume loud sound' },
      { e: '📣', n: 'megaphone', k: 'megaphone loud cheer' },
      { e: '🔔', n: 'bell', k: 'bell notify ring alert' },
      { e: '💯', n: 'hundred points', k: '100 perfect score full marks' },
      { e: '❗', n: 'exclamation mark', k: 'exclamation important warning' },
      { e: '❓', n: 'question mark', k: 'question ask what' },
      { e: '‼️', n: 'double exclamation', k: 'exclamation important urgent' },
      { e: '⁉️', n: 'exclamation question mark', k: 'what surprised combined' },
      { e: '⚠️', n: 'warning', k: 'warning caution alert danger' },
      { e: '🚸', n: 'children crossing', k: 'child cross sign school' },
      { e: '⛔', n: 'no entry', k: 'no stop forbidden entry' },
      { e: '🚫', n: 'prohibited', k: 'no forbidden banned prohibited' },
      { e: '❌', n: 'cross mark', k: 'no wrong x close delete' },
      { e: '✅', n: 'check mark button', k: 'yes check ok done correct' },
      { e: '☑️', n: 'check box', k: 'checkbox check done' },
      { e: '✔️', n: 'check mark', k: 'check yes done correct tick' },
      { e: '➕', n: 'plus', k: 'plus add positive' },
      { e: '➖', n: 'minus', k: 'minus subtract negative' },
      { e: '✖️', n: 'multiply', k: 'multiply times cross' },
      { e: '➗', n: 'divide', k: 'divide slash math' },
      { e: '♾️', n: 'infinity', k: 'infinity loop forever endless' },
      { e: '🔄', n: 'counterclockwise arrows', k: 'refresh reload arrows cycle' },
      { e: '↩️', n: 'right arrow curving left', k: 'back return undo' },
      { e: '↪️', n: 'left arrow curving right', k: 'forward redo' },
      { e: '⬆️', n: 'up arrow', k: 'up arrow increase' },
      { e: '⬇️', n: 'down arrow', k: 'down arrow decrease' },
      { e: '➡️', n: 'right arrow', k: 'right arrow next forward' },
      { e: '⬅️', n: 'left arrow', k: 'left arrow back previous' },
      { e: '↗️', n: 'up-right arrow', k: 'diagonal arrow up right' },
      { e: '↘️', n: 'down-right arrow', k: 'diagonal arrow down right' },
      { e: '↙️', n: 'down-left arrow', k: 'diagonal arrow down left' },
      { e: '↖️', n: 'up-left arrow', k: 'diagonal arrow up left' },
      { e: '🔃', n: 'clockwise arrows', k: 'arrows reload clockwise' },
      { e: '🔝', n: 'TOP arrow', k: 'top up arrow label' },
      { e: '🔙', n: 'BACK arrow', k: 'back return arrow' },
      { e: '🔜', n: 'SOON arrow', k: 'soon forward arrow' },
      { e: '🆗', n: 'OK button', k: 'ok approved button' },
      { e: '🆙', n: 'UP! button', k: 'up button increase' },
      { e: '🆕', n: 'NEW button', k: 'new fresh button' },
      { e: '🆓', n: 'FREE button', k: 'free no cost button' },
      { e: '🆘', n: 'SOS button', k: 'sos emergency help' },
      { e: '🏧', n: 'ATM sign', k: 'atm cash machine bank' },
      { e: '♻️', n: 'recycling symbol', k: 'recycle green environment' },
      { e: '🔰', n: 'Japanese symbol for beginner', k: 'beginner japan new green' },
      { e: '✴️', n: 'eight-pointed star', k: 'star eight pointed' },
      { e: '🌀', n: 'cyclone', k: 'spiral cyclone swirl' },
      { e: '💠', n: 'diamond with a dot', k: 'diamond dot blue' },
      { e: '🔷', n: 'large blue diamond', k: 'diamond blue shape' },
      { e: '🔶', n: 'large orange diamond', k: 'diamond orange shape' },
      { e: '🔵', n: 'blue circle', k: 'circle blue dot' },
      { e: '🔴', n: 'red circle', k: 'circle red dot' },
      { e: '🟢', n: 'green circle', k: 'circle green dot' },
      { e: '🟡', n: 'yellow circle', k: 'circle yellow dot' },
      { e: '⚫', n: 'black circle', k: 'circle black dot' },
      { e: '⚪', n: 'white circle', k: 'circle white dot' },
      { e: '🔲', n: 'black square button', k: 'square black button' },
      { e: '🔳', n: 'white square button', k: 'square white button' },
      { e: '⬛', n: 'black large square', k: 'square black solid' },
      { e: '⬜', n: 'white large square', k: 'square white solid' },
      { e: '🟥', n: 'red square', k: 'square red shape' },
      { e: '🟧', n: 'orange square', k: 'square orange shape' },
      { e: '🟨', n: 'yellow square', k: 'square yellow shape' },
      { e: '🟩', n: 'green square', k: 'square green shape' },
      { e: '🟦', n: 'blue square', k: 'square blue shape' },
      { e: '🟪', n: 'purple square', k: 'square purple shape' },
    ],
  },
  {
    id: 'flags',
    label: 'Flags',
    icon: '🏁',
    emojis: [
      { e: '🏁', n: 'chequered flag', k: 'race finish checkered flag' },
      { e: '🚩', n: 'triangular flag', k: 'flag red triangular' },
      { e: '🎌', n: 'crossed flags', k: 'japan crossed flags' },
      { e: '🏴', n: 'black flag', k: 'flag black pirate' },
      { e: '🏳️', n: 'white flag', k: 'flag white surrender' },
      { e: '🏳️‍🌈', n: 'rainbow flag', k: 'pride rainbow lgbt' },
      { e: '🏳️‍⚧️', n: 'transgender flag', k: 'trans transgender flag' },
      { e: '🏴‍☠️', n: 'pirate flag', k: 'pirate skull crossbones flag' },
      { e: '🇺🇳', n: 'United Nations flag', k: 'un united nations flag' },
      { e: '🇺🇸', n: 'flag United States', k: 'usa american flag stars stripes' },
      { e: '🇬🇧', n: 'flag United Kingdom', k: 'uk british england flag union jack' },
      { e: '🇨🇦', n: 'flag Canada', k: 'canada canadian flag maple' },
      { e: '🇦🇺', n: 'flag Australia', k: 'australia australian flag' },
      { e: '🇩🇪', n: 'flag Germany', k: 'germany german flag' },
      { e: '🇫🇷', n: 'flag France', k: 'france french flag' },
      { e: '🇯🇵', n: 'flag Japan', k: 'japan japanese flag rising sun' },
      { e: '🇨🇳', n: 'flag China', k: 'china chinese flag red star' },
      { e: '🇮🇳', n: 'flag India', k: 'india indian flag' },
      { e: '🇧🇷', n: 'flag Brazil', k: 'brazil brazilian flag' },
      { e: '🇷🇺', n: 'flag Russia', k: 'russia russian flag' },
      { e: '🇰🇷', n: 'flag South Korea', k: 'korea south korean flag' },
      { e: '🇮🇹', n: 'flag Italy', k: 'italy italian flag' },
      { e: '🇪🇸', n: 'flag Spain', k: 'spain spanish flag' },
      { e: '🇲🇽', n: 'flag Mexico', k: 'mexico mexican flag' },
      { e: '🇳🇱', n: 'flag Netherlands', k: 'netherlands dutch holland flag' },
      { e: '🇸🇦', n: 'flag Saudi Arabia', k: 'saudi arabia flag' },
      { e: '🇹🇷', n: 'flag Turkey', k: 'turkey turkish flag' },
      { e: '🇵🇱', n: 'flag Poland', k: 'poland polish flag' },
      { e: '🇸🇪', n: 'flag Sweden', k: 'sweden swedish flag' },
      { e: '🇮🇱', n: 'flag Israel', k: 'israel israeli flag' },
      { e: '🇵🇹', n: 'flag Portugal', k: 'portugal portuguese flag' },
      { e: '🇦🇷', n: 'flag Argentina', k: 'argentina argentinian flag' },
      { e: '🇬🇷', n: 'flag Greece', k: 'greece greek flag' },
      { e: '🇺🇦', n: 'flag Ukraine', k: 'ukraine ukrainian flag' },
    ],
  },
]

// ─── Emoji lookup map ─────────────────────────────────────────────────────────
const EMOJI_MAP = new Map(
  EMOJI_DATA.flatMap((cat) => cat.emojis.map((em) => [em.e, em]))
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmojiPicker({ query }) {
  const { Kbd } = window.UI || {}

  const [favorites, setFavorites] = React.useState([])
  const [catIdx, setCatIdx] = React.useState(0)
  const [selectedIdx, setSelectedIdx] = React.useState(0)
  const [copiedEmoji, setCopiedEmoji] = React.useState(null)
  const gridRef = React.useRef(null)

  React.useEffect(() => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'getFavorites')
      .then((res) => {
        if (res?.success) setFavorites(res.data || [])
      })
      .catch(console.error)
  }, [])

  const allCategories = React.useMemo(() => {
    const favEmojis = favorites
      .map((e) => EMOJI_MAP.get(e) || { e, n: e, k: '' })
      .filter(Boolean)
    return [{ id: 'favorites', label: 'Favorites', icon: '⭐', emojis: favEmojis }, ...EMOJI_DATA]
  }, [favorites])

  const searchResults = React.useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    if (!q) return null
    const results = []
    const seen = new Set()
    for (const cat of EMOJI_DATA) {
      const catMatch = cat.label.toLowerCase().includes(q) || cat.id.includes(q)
      for (const em of cat.emojis) {
        if (seen.has(em.e)) continue
        if (catMatch || em.n.toLowerCase().includes(q) || em.k.includes(q)) {
          results.push(em)
          seen.add(em.e)
        }
      }
    }
    return results
  }, [query])

  const visibleEmojis = searchResults || allCategories[catIdx]?.emojis || []

  React.useEffect(() => {
    setSelectedIdx(0)
  }, [catIdx, query])

  React.useEffect(() => {
    if (!gridRef.current || visibleEmojis.length === 0) return
    const el = gridRef.current.children[selectedIdx]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIdx])

  const isFav = (emoji) => favorites.includes(emoji)

  const toggleFavorite = React.useCallback((emoji) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'toggleFavorite', emoji)
      .then((res) => {
        if (res?.success) setFavorites(res.data || [])
      })
      .catch(console.error)
  }, [])

  const copyEmoji = React.useCallback((emoji) => {
    window.core?.ipc
      ?.invoke(EXT_ID, 'copy', emoji)
      .then(() => {
        setCopiedEmoji(emoji)
        setTimeout(() => setCopiedEmoji(null), 1200)
        setTimeout(() => window.core?.window?.hide?.(), 150)
      })
      .catch(console.error)
  }, [])

  React.useEffect(() => {
    const handleKey = (e) => {
      const { key, ctrlKey } = e.detail

      if (ctrlKey && (key === 'ArrowRight' || key === 'ArrowLeft')) {
        if (!searchResults) {
          setCatIdx((prev) =>
            key === 'ArrowRight'
              ? (prev + 1) % allCategories.length
              : (prev - 1 + allCategories.length) % allCategories.length
          )
        }
        return
      }

      if (ctrlKey && (key === 'f' || key === 'F')) {
        const em = visibleEmojis[selectedIdx]
        if (em) toggleFavorite(em.e)
        return
      }

      const len = visibleEmojis.length
      if (len === 0) return

      if (key === 'ArrowRight') {
        setSelectedIdx((prev) => Math.min(prev + 1, len - 1))
      } else if (key === 'ArrowLeft') {
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      } else if (key === 'ArrowDown') {
        setSelectedIdx((prev) => Math.min(prev + COLS, len - 1))
      } else if (key === 'ArrowUp') {
        setSelectedIdx((prev) => Math.max(prev - COLS, 0))
      } else if (key === 'Enter') {
        const em = visibleEmojis[selectedIdx]
        if (em) copyEmoji(em.e)
      }
    }

    window.addEventListener('nuxy-shell-omni-bar-keydown', handleKey)
    return () => window.removeEventListener('nuxy-shell-omni-bar-keydown', handleKey)
  }, [visibleEmojis, selectedIdx, allCategories, searchResults, toggleFavorite, copyEmoji])

  const selectedEmoji = visibleEmojis[selectedIdx]

  React.useEffect(() => {
    const hints = (
      <>
        {copiedEmoji ? (
          <span style={{ color: 'var(--color-success, #4ade80)' }}>Copied {copiedEmoji}</span>
        ) : selectedEmoji ? (
          <span style={{ opacity: 0.7 }}>{selectedEmoji.e}  {selectedEmoji.n}</span>
        ) : null}
        <Kbd style={{ marginLeft: 6 }}>↵</Kbd>
        <span>copy</span>
        <Kbd style={{ marginLeft: 6 }}>^F</Kbd>
        <span>{selectedEmoji && isFav(selectedEmoji.e) ? 'unfav' : 'fav'}</span>
        {!searchResults && (
          <>
            <Kbd style={{ marginLeft: 6 }}>^←</Kbd>
            <Kbd>^→</Kbd>
            <span>cat</span>
          </>
        )}
      </>
    )
    window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: hints }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [selectedEmoji, copiedEmoji, searchResults, favorites])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Category tabs ── */}
      {!searchResults && (
        <div
          style={{
            display: 'flex',
            padding: '4px 6px',
            gap: 2,
            borderBottom: '1px solid rgba(128,128,128,0.18)',
            flexShrink: 0,
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {allCategories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => setCatIdx(idx)}
              title={cat.label}
              style={{
                background: idx === catIdx ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                padding: '4px 9px',
                fontSize: 17,
                lineHeight: 1,
                opacity: idx === catIdx ? 1 : 0.55,
                transition: 'opacity 0.1s, background 0.1s',
                flexShrink: 0,
                outline: 'none',
              }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* ── Search results label ── */}
      {searchResults && (
        <div
          style={{
            padding: '4px 12px 2px',
            fontSize: 11,
            opacity: 0.45,
            flexShrink: 0,
            letterSpacing: 0.2,
          }}
        >
          {searchResults.length} emoji{searchResults.length !== 1 ? 's' : ''} found
        </div>
      )}

      {/* ── Emoji grid ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px' }}>
        {visibleEmojis.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.38,
              fontSize: 13,
              textAlign: 'center',
              padding: '0 20px',
            }}
          >
            {catIdx === 0 && !searchResults
              ? 'No favorites yet — press Ctrl+F on an emoji to add it.'
              : 'No results.'}
          </div>
        ) : (
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 2,
            }}
          >
            {visibleEmojis.map((em, idx) => {
              const isSelected = idx === selectedIdx
              const fav = isFav(em.e)
              return (
                <button
                  key={em.e + idx}
                  onClick={() => copyEmoji(em.e)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    toggleFavorite(em.e)
                  }}
                  title={`${em.n}${fav ? ' ⭐' : ''}`}
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.14)' : 'transparent',
                    border: isSelected
                      ? '1px solid rgba(255,255,255,0.28)'
                      : '1px solid transparent',
                    borderRadius: 7,
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontSize: 22,
                    lineHeight: 1,
                    position: 'relative',
                    transition: 'background 0.08s',
                    outline: 'none',
                  }}
                >
                  {em.e}
                  {fav && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 1,
                        right: 2,
                        fontSize: 7,
                        lineHeight: 1,
                        opacity: 0.75,
                      }}
                    >
                      ★
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bottom bar (removed — hints shown in shell footer) ── */}
    </div>
  )
}
