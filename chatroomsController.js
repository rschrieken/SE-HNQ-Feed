
function ChatroomsController()
{
  function getChatrooms(){
    function getChatroomsInternal(resolve, reject) {
      var se = 'chat.se'
        , mse= 'chat.mse'
        , so = 'chat.so'
        , chatrooms;
      
      chatrooms = [
        {server: se, url:'https://chat.stackexchange.com/rooms/info/89485/hot-network-questions', name:'Hot Network Questions'},
        {server: se, url:'https://chat.stackexchange.com/rooms/info/106727/gis-hot-network-questions?tab=feeds', name:'GIS Hot Network Questions'},
        {server: se, url:'https://chat.stackexchange.com/rooms/info/96491/ul-hnq-smokedetector-room?tab=feeds', name:'U&L HNQ & SmokeDetector room'},
        {server: se, url:'https://chat.stackexchange.com/rooms/info/70737/listing-bounties-and-hnqs?tab=feeds', name:'Listing bounties and HNQs'},
        {server: se, url:'https://chat.stackexchange.com/rooms/info/92757/the-outreach-department?tab=feeds', name:'The Outreach Department'},
        {server: se, url:'https://chat.stackexchange.com/rooms/info/108277/testing-bounties?tab=feeds', name:'Testing Bounties'},
        {server: mse, url:'https://chat.meta.stackexchange.com/rooms/info/1196/sandbox-trash-bin-something?tab=feeds', name:'Sandbox/Trash Bin/Something'},
        {server: so, url:'https://chat.stackoverflow.com/rooms/info/68414/socvr-testing-facility?tab=feeds', name:'SOCVR Testing Facility'},
        
      ];
      resolve({rooms: chatrooms});
    }
    return new Promise(getChatroomsInternal);
  }
  
  return {
    getChatrooms: getChatrooms
  }
}

module.exports = ChatroomsController;