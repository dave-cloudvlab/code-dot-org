'use strict';
/* global describe */
/* global beforeEach */
/* global it */
/* global $ */

var testUtils = require('../util/testUtils');
testUtils.setupLocale('netsim');
var assert = testUtils.assert;
var netsimTestUtils = require('../util/netsimTestUtils');
var fakeShard = netsimTestUtils.fakeShard;

var NetSimLocalClientNode = require('@cdo/apps/netsim/NetSimLocalClientNode');
var NetSim = require('@cdo/apps/netsim/netsim');
var NetSimWire = require('@cdo/apps/netsim/NetSimWire');
var NetSimRouterNode = require('@cdo/apps/netsim/NetSimRouterNode');
var NetSimVizNode = require('@cdo/apps/netsim/NetSimVizNode');
var NetSimVizWire = require('@cdo/apps/netsim/NetSimVizWire');
var NetSimVizSimulationNode = require('@cdo/apps/netsim/NetSimVizSimulationNode');
var NetSimVizSimulationWire = require('@cdo/apps/netsim/NetSimVizSimulationWire');
var NetSimVisualization = require('@cdo/apps/netsim/NetSimVisualization');

describe("NetSimVisualization", function () {
  
  var testShard, alphaNode, betaNode, deltaNode, router,
      alphaToRouterWire, betaToRouterWire, deltaToAlphaWire, netSimVis;

  /**
   * Synchronous client creation on shard for test
   * @param {string} displayName
   * @returns {NetSimVizSimulationNode}
   */
  var makeRemoteClient = function (displayName) {
    var newClient;
    NetSimLocalClientNode.create(testShard, displayName, function (e, n) {
      newClient = n;
    });
    assert(newClient !== undefined, "Failed to create a remote client.");
    return new NetSimVizSimulationNode(newClient);
  };

  /**
   * Synchronous router creation on shard for test
   * @returns {NetSimVizSimulationNode}
   */
  var makeRemoteRouter = function () {
    var newRouter;
    NetSimRouterNode.create(testShard, function (e, r) {
      newRouter = r;
    });
    assert(newRouter !== undefined, "Failed to create a remote router.");
    return new NetSimVizSimulationNode(newRouter);
  };

  /**
   * Synchronous wire creation on shard for test
   * @param {number} localNodeID
   * @param {number} remoteNodeID
   * @returns {NetSimVizSimulationWire}
   */
  var makeRemoteWire = function (localVizNode, remoteVizNode, elements) {
    var newWire;
    NetSimWire.create(testShard, localVizNode.getCorrespondingEntityID(), remoteVizNode.getCorrespondingEntityID(), function (e, w) {
      newWire = w;
    });
    assert(newWire !== undefined, "Failed to create a remote wire.");
    return new NetSimVizSimulationWire(newWire, getVizNodeByEntityID_.bind(elements));
  };

  var getVizNodeByEntityID_ = function (_type, id) {
    return this.filter(function(element){
      return element instanceof NetSimVizNode &&
          element.getCorrespondingEntityID &&
          element.getCorrespondingEntityID() === id;
    })[0];
  };

  /**
    * Creates the following test networks with the capitalized N as the
    * vizNode:
    *
    * 1) n -> N = r = n
    *    (two nodes attached to a router, with a third node trying to
    *    connect to one of them)
    *
    * Could (probably should) also create networks that look like this:
    *
    * 1) n -> N = n
    *    (two nodes attached to each other, with a third node trying to
    *    connect to one of them)
    * 2) n -> N <- n
    *    (two nodes trying to connect to a third node)
    */
  beforeEach(function () {
    netsimTestUtils.initializeGlobalsToDefaultValues();
    testShard = fakeShard();

    alphaNode = makeRemoteClient('alpha');
    betaNode = makeRemoteClient('beta');
    deltaNode = makeRemoteClient('delta');
    router = makeRemoteRouter();
    var elements = [alphaNode, betaNode, deltaNode, router];

    alphaToRouterWire = makeRemoteWire(alphaNode, router, elements);
    betaToRouterWire = makeRemoteWire(betaNode, router, elements);
    deltaToAlphaWire = makeRemoteWire(deltaNode, alphaNode, elements);
    elements = elements.concat([alphaToRouterWire, betaToRouterWire, deltaToAlphaWire]);

    // Create an empty NetSim for the runLoop and an svg placeholder so
    // that NetSimVisualization's foreground and background searches
    // work.
    var netsim = new NetSim();
    var svg = $("<svg version=\"1.1\" width=\"298\" height=\"298\" xmlns=\"http://www.w3.org/2000/svg\">" +
        "<g id=\"centered-group\">" +
          "<g id=\"background-group\"></g>" +
          "<g id=\"foreground-group\"></g>" +
        "</g>" +
      "</svg>");
    netSimVis = new NetSimVisualization(svg, netsim.runLoop_);
    netSimVis.elements_ = elements;
    netSimVis.localNode = alphaNode;
  });

  describe("router network with peripheral connection", function () {

    it("correctly retrieves all attached wires", function () {
      var alphaWires = netSimVis.getWiresAttachedToNode(alphaNode);
      assert.sameMembers(alphaWires, [alphaToRouterWire, deltaToAlphaWire]);

      var routerWires = netSimVis.getWiresAttachedToNode(router);
      assert.sameMembers(routerWires, [alphaToRouterWire, betaToRouterWire]);
    });

    it("correctly retrieves all locally attached wires", function () {
      var alphaWires = netSimVis.getLocalWiresAttachedToNode(alphaNode);
      assert.sameMembers(alphaWires, [alphaToRouterWire]);

      var routerWires = netSimVis.getLocalWiresAttachedToNode(router);
      assert.sameMembers(routerWires, []);
    });

    it("correctly retrieves all reciprocated wires", function () {
      var alphaWires = netSimVis.getReciprocatedWiresAttachedToNode(alphaNode);
      assert.sameMembers(alphaWires, [alphaToRouterWire]);

      var betaWires = netSimVis.getReciprocatedWiresAttachedToNode(betaNode);
      assert.sameMembers(betaWires, [betaToRouterWire]);

      var deltaWires = netSimVis.getReciprocatedWiresAttachedToNode(deltaNode);
      assert.sameMembers(deltaWires, []);

      var routerWires = netSimVis.getReciprocatedWiresAttachedToNode(router);
      assert.sameMembers(routerWires, [alphaToRouterWire, betaToRouterWire]);
    });

    it("pulls the correct elements to the foreground", function () {
      netSimVis.pullElementsToForeground();

      // Foreground elements
      assert.isTrue(alphaNode.isForeground);
      assert.isTrue(betaNode.isForeground);
      assert.isTrue(router.isForeground);
      assert.isTrue(alphaToRouterWire.isForeground);
      assert.isTrue(betaToRouterWire.isForeground);

      // background elements
      assert.isFalse(deltaNode.isForeground);
      assert.isFalse(deltaToAlphaWire.isForeground);
    });

  });

});
