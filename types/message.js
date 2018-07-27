module.exports = class Message {
    constructor(channelID, content) {
        this.channelID = channelID;
        this.content = content ? content : '';// = text ? text : '';
        //this.embed = embed;
    }
}