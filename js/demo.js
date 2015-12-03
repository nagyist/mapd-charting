/*
 * This is example code that shows how to make 3 cross-filtered charts with the
 * dc.mapd.js API. This example is not meant to be a replacement for dc.js
 * documentation.  For the dc.js API docs, see here
 * - https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md.
 *   For an annotated example of using dc.js - see here:
 *   https://dc-js.github.io/dc.js/docs/stock.html.
 */

function CreateCharts(crossFilter) { 

  var colorScheme = ["#22A7F0", "#3ad6cd", "#d4e666"]

  var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50
  var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200

/*
 * crossFilter is an object that handles cross-filtered the different
 * dimensions and measures that compose a dashboard's charts. 
 * It has a number of methods on it.
 */

/*
 *  getColumns() will grab all columns from the table along with metadata about
 *  those columns.
 */

    var allColumns = crossFilter.getColumns();
 

 /*-------------------BASIC COUNT ON CROSSFILTER---------------------------*/

/*
 *  A basic operation is getting the filtered count and total count
 *  of crossFilter.  This performs that operation.  It is built into DC.
 *  Note that for the count we use crossFilter itself as the dimension.
*/

      var countDim = crossFilter;
      var countGroup = crossFilter.groupAll();
      dc.dataCount(".data-count")
        .dimension(countDim)
        .group(countGroup);

/*------------------------CHART 1 EXAMPLE------------------------------*/

/*
 *  In crossfilter dimensions can function as what we would like to "group by"
 *  in the SQL sense of the term. We'd like to create a bar chart of number of
 *  flights by destination state ("dest_state") - so we create a crossfilter dimension
 *  on "dest_state"
 *
 *  Here lies one of the chief differences between crossfilter.mapd.js and the
 *  original crossfilter.js.  In the original crossfilter you could provide
 *  javascript expressions like d.dest_state.toLowerCase() as part of
 *  dimension, group and order functions.  However since ultimately our
 *  dimensions and measures are transformed into SQL that hit our backend, we
 *  require string expressions. (i.e "extract(year from dep_timestamp))"
 */

    var rowChartDimension = crossFilter.dimension("dest_state");   
/* 
 * To group by a variable, we call group() on the function and then specify
 * a "reducer".  Here we want to get the count for each state, so we use the 
 * crossfilter reduceCount() method.
 *
 * More crossfilter Methods here:
 * https://github.com/square/crossfilter/wiki/API-Reference#dimension
 * https://github.com/square/crossfilter/wiki/API-Reference#group-map-reduce
 * https://github.com/square/crossfilter/wiki/API-Reference#group_reduceCount
 */
    var rowChartGroup = rowChartDimension.group().reduceCount();

/*
 *  We create a horizontal bar chart with the data specified above (count by destination
 *  state) by using a dc.rowChart (i.e. a horizontal bar chart)
 *
 *  We invoke the following options on the rowChart using chaining.
 *
 *  Height and width - match the containing div
 *
 *  elasticX - a dc option to cause the axis to rescale as other filters are
 *  applied
 *
 *  cap(20) - Only show the top 20 groups.  By default crossFilter will sort
 *  the dimension expression (here, "dest_state"), by the reduce expression (here, count),
 *  so we end up with the top 20 destination states ordered by count.
 *
 *  othersGrouper(false) - We only would like the top 20 states and do not want
 *  a separate bar combining all other states.
 *
 *  ordinalColors(colorScheme) - we want to color the bars by dimension, i.e. dest_state,
 *  using the color ramp defined above (an array of rgb or hex values)
 *
 *  measureLabelsOn(true) - a mapd.dc.js add-on which allows not only the dimension
 *  labels (i.e. Texas) to be displayed but also the measures (i.e. the number
 *  of flights with Texas as dest_state)
 *
 *  Simple Bar Chart Example using DC api here:
 *  https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md
 */

    var dcBarChart =  dc.rowChart('.chart1-example')
                      .height(h/1.5)
                      .width(w/2)
                      .elasticX(true)
                      .cap(20)
                      .othersGrouper(false)
                      .ordinalColors(colorScheme)
                      .measureLabelsOn(true)
                      .dimension(rowChartDimension)
                      .group(rowChartGroup);


/*--------------------------CHART 2 EXAMPLE------------------------------*/

/*
 *  Bubble Chart Example:
 *  Here we will create a bubble chart (scatter plot with sized circles).
 *  We want to make a circle for each airline carrier - i.e. group by 
 *  carrier ("carrier_name" in the dataset), with the x coordinate
 *  corresponding to average departure delay ("depdelay"), the y coordinate
 *  corresponding to average arrival delay ("arrdelay"), and the size of the
 *  circle corresponding to the number of flights for that carrier (the count).
 *  We will color by the group or key, i.e. carrier_name.
 *
 */

    var scatterPlotDimension = crossFilter.dimension("carrier_name");

/*
 *  MapD created a reduceMulti function in order to handle multiple measures. 
 *  It takes an array of objects, each corresponding to a measure.
 *  Each measure object requires 3 arguments:
 *  'expression' which is the measure
 *  'agg_mode' which is the calculation to perform.
 *  'name' is how to reference the data
 *
 */

    var reduceMultiExpression1 = [{
      expression: "depdelay", 
      agg_mode:"avg", 
      name: "x"
    },
    {
      expression: "arrdelay", 
      agg_mode:"avg", 
      name: "y"
    },
    {
      expression: "count", 
      agg_mode:"count", 
      name: "size"
    }]

/*
 * Note the order("size") setter here. By default the bubble chart uses the
 * top function which sorts all measures in descending order.  This would
 * cause the us to take the top n (specified by cap) sorted by x, y, and
 * size in descending order.  Since we probably do not want to sort
 * primarility by departure delay, we override the sort and sort by size
 * instead, which corresponds to the count measure - i.e. we take the
 * n most popular airlines 
 */
    
    var scatterPlotGroup = scatterPlotDimension
                        .group()
                        .reduceMulti(reduceMultiExpression1)
                        .order("size")

/*  We create the bubble chart with the following parameters:
 *
 *  Width and height - as above
 *
 *  renderHorizontalGridLines(true) 
 *
 *  renderVerticalGridLines(true) - create grid under points
 *
 *  cap(15) - only show top 15 airlines 
 *
 *  othersGrouper(false) - do not have a bubble for airlines not in top 15
 *
 *  **Note for all accessors below the variables correspond to variables
 *  defined in reduceMulti above**
 *
 *  keyAccessor - specify variable in result set associated with key (x-axis in
 *  bubble chart)
 *
 *  valueAccessor - specify variable in result set associated with value (y-axis in bubble chart)
 *
 *  radiusValueAccessor - specify variable in result set associated with radius of the bubbles 
 *
 *  colorAccessor - specify variable in result set associated with color of the
 *  bubbles.  Here we are not coloring by a measure but instead by the groups
 *  themselves so we specify the first (and only) key, key0,  If we were
 *  grouping by multiple (N) attributes we would have key0, key1... keyN
 *
 *  maxBubbleRelativeSize(0.04) - specifies the max radius relative to length
 *  of the x axis. This means we cap the bubble radius at 4% of the length of
 *  the x axis.
 *
 *  transitionDuration(500) - DC (via D3) will animate movement of the points
 *  between filter changes.  This specifies that the animation duration should
 *  be 500 ms.
 *
 *  xAxisLabel, yAxisLabel - specify the labels of the charts
 *
 *  elasticX(true), elasticY(true) - allow the axes to readjust as filters are
 *  changed
 *
 *  xAxisPadding('15%'), yAxisPadding('15%') - Without padding the min and max
 *  points for the x and y scales will be on the edge of the graph.  This tells
 *  the chart to add an extra 15% margin to the axes beyond the min and max of
 *  that axis
 *
 *  ordinalColors(colorScheme) - we want to color the bars by dimension, i.e. dest_state,
 *  using the color ramp defined above (an array of rgb or hex values)
 */
     dcScatterPlot =  dc.bubbleChart('.chart2-example')
                      .width(w/2)
                      .height(h/1.5)
                      .renderHorizontalGridLines(true)
                      .renderVerticalGridLines(true)
                      .cap(15)
                      .othersGrouper(false)
                      .keyAccessor(function (d) {
                          return d.x;
                      })
                      .valueAccessor(function (d) {
                          return d.y;
                      })
                      .radiusValueAccessor(function (d) {
                          return d.size;
                      })
                      .colorAccessor(function(d) {
                          return d.key0;
                      })
                      .maxBubbleRelativeSize(0.04)
                      .transitionDuration(500)
                      .xAxisLabel('Departure Delay')
                      .yAxisLabel('Arrival Delay')
                      .elasticX(true)
                      .elasticY(true)
                      .xAxisPadding('15%')
                      .yAxisPadding('15%')
                      .ordinalColors(colorScheme)
                      .dimension(scatterPlotDimension)
                      .group(scatterPlotGroup);
                      
/*  We create the bubble chart with the following parameters:
 *  dc.mapd.js allows functions to be applied at specific points in the chart's
 *  lifecycle.  Here we want to re-adjust our chart's x,y and r (radius) scales
 *  as data is filtered in an out to take into account the changing range of
 *  the data along these different measures.  Here we set the charts scale
 *  using standard d3 functions - telling dc.mapd.js to do this before each
 *  render and redraw */

    var setScales = function(chart, type){
      chart.on(type, function(chart) {
        chart.x(d3.scale.linear().domain(d3.extent(chart.data(), chart.keyAccessor())));
        chart.y(d3.scale.linear().domain(d3.extent(chart.data(), chart.valueAccessor())));
        chart.r(d3.scale.linear().domain(d3.extent(chart.data(), chart.radiusValueAccessor())));
      });
    }

    setScales(dcScatterPlot, "preRender");
    setScales(dcScatterPlot, "preRedraw");

/*---------------------TIME CHART (CHART 3) EXAMPLE------------------------------*/

/*
 *  First we want to determine the extent (min,max) of the time variable so we
 *  can set the bounds on the time chart appropriately.
 *
 *  If you know the bounds a priori you can do this manually but here we will
 *  do it dymaically via a query sent to the backend through the crossfilter
 *  api.
 *
 *  We create a reduceMulti expression that will get the min and max of the
 *  variable dep_timestamp.
 *
 */

    var reduceMultiExpression2 = 
    [{
      expression: "dep_timestamp", 
      agg_mode:"min", 
      name: "min"
    },
    {
      expression: "dep_timestamp", 
      agg_mode:"max", 
      name: "max"}
    ]

    /* Note than when we are doing aggregations over the entire dataset we use
     * the crossfilter object itself as the dimension with the groupAll method
     *
     * values(true) gets the values for our groupAll measure (here min and max
     * of dep_timestamp) - true means to ignore currently set filters - i.e.
     * get a global min and max
     */

    var timeChartBounds = crossFilter
                          .groupAll()
                          .reduceMulti(reduceMultiExpression2)
                          .values(true);
                            
    var timeChartDimension = crossFilter.dimension("dep_timestamp");

    /* We would like to bin or histogram the time values.  We do this by
     * invoking setBinParams on the group.  Here we are asking for 400 equal
     * sized bins from the min to the max of the time range
     */

    var timeChartGroup = timeChartDimension.group() 
                .reduceCount()
                .setBinParams({
                   numBins: 400, 
                   binBounds: [timeChartBounds.min,timeChartBounds.max]
                  });

  /*  We create the time chart as a line chart
   *  with the following parameters:
   *
   *  Width and height - as above
   *
   *  elasticY(true) - cause the y-axis to scale as filters are changed
   *
   *  renderHorizontalGridLines(true) - add grid lines to the chart
   *
   *  brushOn(true) - Request a filter brush to be added to the chart - this
   *  will allow users to drag a filter window along the time chart and filter
   *  the rest of the data accordingly
   *
   */

    var dcTimeChart = dc.lineChart('.chart3-example')
      .width(w)
      .height(h/2.5)
      .elasticY(true)
      .renderHorizontalGridLines(true)
      .brushOn(true)
      .xAxisLabel('Departure Time')
      .yAxisLabel('# Flights')
      .dimension(timeChartDimension)
      .group(timeChartGroup);

    /* Set the x and y axis formatting with standard d3 functions */

    dcTimeChart
      .x(d3.time.scale.utc().domain([timeChartBounds.min,timeChartBounds.max]))
      .yAxis().ticks(5);

    dcTimeChart
      .xAxis().orient('top');

    /* Calling dc.renderAll() will render all of the charts we set up.  Any
     * filters applied by the user (via clicking the bar chart, scatter plot or dragging the time brush) will automagically call redraw on the charts without any intervention from us
     */

    dc.renderAll()



/*--------------------------RESIZE EVENT------------------------------*/

    /* Here we listen to any resizes of the main window.  On resize we resize the corresponding widgets and call dc.renderAll() to refresh everything */
  
    window.addEventListener("resize", debounce(reSizeAll, 100));

    function reSizeAll(){
      var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) - 50
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) - 200

      dcBarChart
        .height(h/1.5)
        .width(w/2)

      dcScatterPlot
        .height(h/1.5)
        .width(w/2)

      dcTimeChart
        .width(w)
        .height(h/2.5)

      dc.renderAll();
    }

}



function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};


function init() {

  /*
   * mapdcon is a monad.
   * 
   * It provides a MapD specific API to Thrift.  Thrift is used to connect to our
   * database backend.
   */

  /* Before doing anything we must set up a mapd connection, specifying
   * username, password, host, port, and database name */
  var con = mapdcon()
    .setUserAndPassword('mapd', 'HyperInteractive')
    .setHost("demo.mapd.com") 
    .setPort("9090")
    .setDbName("mapd")
    .connect();
  
  /*
   *  This instaniates a new crossfilter.
   *  Pass in mapdcon as the first argument to crossfilter, then the
   *  table name, then a label for the data (unused in this example).
   *
   *  to see all availables --  con.getTables()
   */  
  var crossFilter = crossfilter(con,"flights","flights");
  
  /*
   *  Pass instance of crossfilter into our CreateCharts.
   */  

  var chart = new CreateCharts(crossFilter);
}

document.addEventListener('DOMContentLoaded', init, false);

