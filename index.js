var client = require('./client'),
	champions = require('./api/champions'),
	items = require('./api/items'),
	spells = require('./api/spells');

module.exports = {
	client: client,
	champions: champions,
	items: items,
	spells: spells 
}