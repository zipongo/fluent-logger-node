var expect = require('chai').expect;
var sender = require('../../lib/sender/tcp');
var runServer = require('../../lib/testHelper').runServer;
var async = require('async');

describe("TcpSender", function(){
  it('should send records', function(done){
    runServer(function(server, finish){
      var s1 = new sender.TcpSender('debug', { port: server.port });
      var emits = [];
      function emit(k){
        emits.push(function(done){ s1.emit('record', k, done); });
      }
      for(var i=0; i<10; i++){
        emit(i);
      }
      emits.push(function(){
        finish(function(data){
          expect(data.length).to.be.equal(10);
          for(var i=0; i<10; i++){
            expect(data[i].tag).to.be.equal("debug.record");
            expect(data[i].data).to.be.equal(i);
          }
          done();
        });
      });
      async.series(emits);
    });
  });

  it('should raise error when connection fails', function(done){
    var s = new sender.TcpSender('debug', {
      host: 'localhost',
      port: 65535
    });
    s.on('error', function(err){
      expect(err.code).to.be.equal('ECONNREFUSED');
      done();
    });
    s.emit('test connection error', 'foobar');
  });


  it('should assure the sequence.', function(done){
    runServer(function(server, finish){
      var s = new sender.TcpSender('debug', {port: server.port});
      s.emit('1st record', '1st data');
      s.emit('2nd record', '2nd data');
      s.end('last record', 'last data', function(){
        finish(function(data){
          expect(data[0].tag).to.be.equal('debug.1st record');
          expect(data[0].data).to.be.equal('1st data');
          expect(data[1].tag).to.be.equal('debug.2nd record');
          expect(data[1].data).to.be.equal('2nd data');
          expect(data[2].tag).to.be.equal('debug.last record');
          expect(data[2].data).to.be.equal('last data');
          done();
        });
      });
    });
  });

  it('should resume the connection automatically and flush the queue', function(done){
    var s = new sender.TcpSender('debug');
    s.emit('1st record', '1st data');
    s.on('error', function(err){
      expect(err.code).to.be.equal('ECONNREFUSED');
      runServer(function(server, finish){
        s.port = server.port;
        s.emit('2nd record', '2nd data');
        s.end('last record', 'last data', function(){
          finish(function(data){
            expect(data[0].tag).to.be.equal('debug.1st record');
            expect(data[0].data).to.be.equal('1st data');
            expect(data[1].tag).to.be.equal('debug.2nd record');
            expect(data[1].data).to.be.equal('2nd data');
            expect(data[2].tag).to.be.equal('debug.last record');
            expect(data[2].data).to.be.equal('last data');
            done();
          });
        });
      });
    });
  });
});