/******************************************************************************
 * EXTEND: dc.bubbleRasterChart                                               *
 * ***************************************************************************/


dc.bubbleRasterChart = function(parent, useMap, chartGroup) {
    var _chart = null;

    var _useMap = useMap !== undefined ? useMap : false;

    if (_useMap)
        _chart = dc.rasterMixin(dc.mapMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({})))));
    else
        _chart = dc.rasterMixin(dc.colorMixin(dc.capMixin(dc.baseMixin({}))));

    var _imageOverlay = null;

    var _x = null;
    var _y = null;
    var _r = 1; // default radius 5
    _chart.colors("#22A7F0"); // set constant as picton blue as default

    /**
     #### .x([scale])
     Gets or sets the x scale. The x scale can be any d3
     [quantitive scale](https://github.com/mbostock/d3/wiki/Quantitative-Scales)
     **/
    _chart.x = function (x) {
        if (!arguments.length) {
            return _x;
        }
        _x = x;
        return _chart;
    };

    /**
    #### .y([yScale])
    Get or set the y scale. The y scale is typically automatically determined by the chart implementation.

    **/
    _chart.y = function (_) {
        if (!arguments.length) {
            return _y;
        }
        _y = _;
        return _chart;
    };

    _chart.r = function (_) {
        if (!arguments.length) {
            return _r;
        }
        _r = _;
        return _chart;
    };

    _chart.setDataAsync(function(group, callbacks) {
        updateXAndYScales();
        _chart._resetVegaSpec();
        genVegaSpec();
        if (_chart.cap() === Infinity) {
          group.allAsync(callbacks);
        }
        else {
            group.topAsync(_chart.cap(),undefined, JSON.stringify(_chart._vegaSpec), callbacks);
        }
    });

    _chart.data(function (group) {

        if (_chart.dataCache !== null)
            return _chart.dataCache;
        updateXAndYScales();
        _chart._resetVegaSpec();
        genVegaSpec();

        if (_chart.cap() === Infinity) {
            return group.all(JSON.stringify(_chart._vegaSpec));
        }
        else {
            return group.top(_chart.cap(), undefined, JSON.stringify(_chart._vegaSpec));
        }
    });

    function genVegaSpec() {
        // scales
        _chart._vegaSpec.scales = [];
        if (_x === null || _y === null || _r === null)
            return;
            //throw ("Bubble raster chart missing mandatory scale");

        var xScaleType = _chart._determineScaleType(_x);
        /*
        var xDomain = _x.domain();
        xDomain[0] = xDomain[0].toFixed(10)/1;
        xDomain[1] = xDomain[1].toFixed(10)/1;
        console.log(xDomain);
        */
        _chart._vegaSpec.scales.push({name: "x", type: xScaleType, domain: _x.domain(), range: "width"})

        var yScaleType = _chart._determineScaleType(_y);
        /*
        var yDomain = _y.domain();
        yDomain[0] = yDomain[0].toFixed(10)/1;
        yDomain[1] = yDomain[1].toFixed(10)/1;
        */
        _chart._vegaSpec.scales.push({name: "y", type: yScaleType, domain: _y.domain(),range: "height"})
        var rIsConstant = false;
        if (typeof _r === 'function') {
            var rScaleType = _chart._determineScaleType(_r);
            _chart._vegaSpec.scales.push({name: "size", type: rScaleType, domain: _r.domain(), range: _r.range()});
        }
        else {
            rIsConstant = true;
        }
        var colorIsConstant = false;

        var colors = _chart.colors();
        if (colors !== null) {
            if (typeof colors === '[object Function]') {
                var colorScaleType = _chart._determineScaleType(colors);
                _chart._vegaSpec.scales.push({name: "color", type: colorScaleType, domain: colors.domain(), range: colors.range()})
            }
            else
                colorIsConstant = true;
        }

        //_chart._vegaSpec.scales.push({name: "color", type: "ordinal", domain: [1,2,3], range: ["red", "blue", "green"]})
        _chart._vegaSpec.marks = [];
        var markObj = {};
        markObj.type = "points";
        markObj.from = {data: "table"};
        markObj.properties = {};
        //markObj.properties.x = {scale: "x", field: _chart.xDim().value()[0]};
        markObj.properties.x = {scale: "x", field: "x"};
        //markObj.properties.y = {scale: "y", field: _chart.yDim().value()[0]};
        markObj.properties.y = {scale: "y", field: "y"};
        if (colorIsConstant)
            markObj.properties.fillColor = {value: _chart.colors()()};
        else
            markObj.properties.fillColor = {scale: "color", field: "color"};

        if (rIsConstant)
            markObj.properties.size = {value: _r};
        else
            markObj.properties.size = {scale: "size", field: "size"};

        _chart._vegaSpec.marks.push(markObj);
        console.log(_chart._vegaSpec);
    }

    function updateXAndYScales () {
        if (_chart.xDim() !== null && _chart.yDim() !== null) {
            if (_x === null) {
                _x = d3.scale.linear();
                _x.domain([0.001,0.999]);
            }
            var xRange = _chart.xDim().getFilter();
            if (xRange !== null)
                _x.domain(xRange[0]); // First element of range because range filter can theoretically support multiple ranges
            if (_y === null) {
                _y = d3.scale.linear();
                _y.domain([0.001,0.999]);
            }
            var yRange = _chart.yDim().getFilter();
            if (yRange !== null)
                _y.domain(yRange[0]); // First element of range because range filter can theoretically support multiple ranges

        }
    }

    _chart.resizeImage = function (minCoord, maxCoord) {
        //console.log(minCoord);
        //console.log(maxCoord);
        var xFilter = _chart.xDim().getFilter()[0];
        var yFilter = _chart.yDim().getFilter()[0];
        var oldMinCoord = [xFilter[0], yFilter[0]];
        var oldMaxCoord = [xFilter[1], yFilter[1]];
        var xZoom = (oldMaxCoord[0] - oldMinCoord[0]) / (maxCoord[0] - minCoord[0])
        var yZoom = (oldMaxCoord[1] - oldMinCoord[1]) / (maxCoord[1] - minCoord[1])
        console.log(xZoom + ", " + yZoom);
        $(".raster-overlay").css("transform", "scale(" + xZoom + "," + yZoom + ")");

    }

    _chart._doRender = function() {
      var data = _chart.data();
      if (_imageOverlay === null) {
        var widgetId = _chart.chartID() - 2;
        _imageOverlay = $('<img class="raster-overlay" />').appendTo("#widget" + widgetId);
        //_imageOverlay = $('<img class="raster-overlay" />').appendTo(_chart._map.getCanvasContainer());
      }
      $(_imageOverlay).attr('src', 'data:image/png;base64,' + data);
    }

    _chart._doRedraw = function() {
      var data = _chart.data();
      if (_imageOverlay === null) {
        var widgetId = _chart.chartID() - 2;
        _imageOverlay = $('<img class="raster-overlay" />').appendTo("#widget" + widgetId);
        //_imageOverlay = $('<img class="raster-overlay" />').appendTo(_chart._map.getCanvasContainer());
      }
        //_chart._map.style.sources["overlay"] = {"type": "image", "url": "data:image/png;base64," + data, "coordinates": [ [-180.0,90.0], [180.0, 90.0], [180.0, -90.0], [-180.0, -90.0] ]};
      $(_imageOverlay).attr('src', 'data:image/png;base64,' + data);
    }

    return _chart.anchor(parent, chartGroup);
}

/******************************************************************************
 * EXTEND END: dc.bubbleRasterChart                                           *
 * ***************************************************************************/
