module.exports = class Message {
    constructor(channelID, text, embed) {
        this.channelID = channelID;
        this.text = text ? text : '';
        this.embed = embed;
    }
}