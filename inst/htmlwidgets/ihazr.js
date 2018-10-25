/* ihazr is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or (at your option) any later version.

 ihazr is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.*/



HTMLWidgets.widget({

  name: 'ihazr',

  type: 'output',

// initializes the layout of the webpage
  initialize: function(el, width, height) {

    return d3.select(el);

  },

// renderValue function takes in
// -el: css element page reference
// -x: values and settings passed in from R to the widget itself
  renderValue: function(el, x) {
// Initialize variables------------------
    // data is all the data from ihazr function (time, status, and marker)
     var data = HTMLWidgets.dataframeToD3(x.data),
    // buttons either T (marker buttons) or F (downselect option)
         buttons = x.settings.buttons,
    // general pad, width, and height variables for page layout
         pad = 30,
         w = 900,
         wFull = w * 2,
         h = 400,
         xPos = w + pad,
    // Number of columns in the data and number of marker variables
         nCol = d3.keys(data[1]).length,
         nVar = d3.keys(data[1]).length - 2,
    // Button display variables
         buttonWidth = w/(nVar) - 10,
         buttonTextSize = Math.min(Math.floor(buttonWidth / 6), 26),
    // Bin size default setting is 2 unless the binMax argument is less than 2
    // Bin max default is 10
         binMax = x.settings.bandMax,
         binSize = Math.min(2, binMax),
    // empty variables for button or dropdown display
         svgbut,
         dropdown,
    // cc will start as first data marker variable but will change once clicked
         cc = d3.keys(data[1])[2],
    // initialize signals for clicking max input, min input, and bin input
         maxInSig = 0,
         minInSig = 0,
         binInSig = 0,
    // sets empty dataframe to be populated when clicked on data region in scatter
         datasub = [],
    // initial start for mouse location [x, y]
         mouse = [w,h/2],
         mouseold = [w,h/2],
    // freeze indicates if the scatterplot has been clicked
         freeze = 0,
    // refresh indicates if a button has been clicked
         refresh = 0,
    // initializes binBurn for clicking in bin selector
         binBurn = 0;

// IF condition for creating buttons, dropdown,
// or neither if there is only one variable

        if(nVar > 1 && buttons === true){
    // creates the red rectangles for the variable buttons
         svgbut = d3.select(el).append("svg")
                    .attr("class", "button")
                    .attr("width", w + 50)
                    .attr("height", h/5);
          svgbut.selectAll(".rect.buttons")
                  .data(d3.keys(data[1]).slice(2, nCol))
                  .enter()
              .append("rect")
                  .attr("class", ".buttons")
                  .attr("x", function(d,i){
                      return i*w/(nVar)+nVar+pad*1.5;
                  })
                  .attr("y", 5)
                  .attr("rx", 3)
                  .attr("ry", 3)
                  .attr("height", h/5-10)
                  .attr("width", buttonWidth)
                  .style("fill-opacity", 1)
                  .style("fill", "rgb(200,50,50)");
    // puts the labels of the variables in the buttons
          svgbut.selectAll(".text.buttons")
                  .data(d3.keys(data[1]).slice(2, nCol))
                  .enter()
              .append("text")
                  .attr("x", function(d,i){
                      return (i+0.5)*w/(nVar)+pad*1.5;
                  })
                  .attr("y", h/10+2)
                  .attr("text-anchor", "middle")
                  .style("stroke", "rgb(250,250,250)")
                  .style("fill", "white")
                  .style("font-weight", "bold")
                  .style("font-family", "Courier")
                  .style("font-size", buttonTextSize + "px")
                  .text(function(d){return d;});
        } else if(nVar > 1 && buttons === false){
    // creates a drop down feature for selecting variables that can be typed into
          dropdown = d3.select(el).append("select")
                        .attr("class", 'DD')
                        .attr("x", 500);

          var options = dropdown.selectAll('option')
                                .data(d3.keys(data[1]).slice(2, nCol));

              options.enter()
                      .append("option")
                      .attr('value', function(d) { return d; })
                      .text(function(d) { return d; });
        }

//SVG Elements--------------------

// sets some white space between the buttons/dropdown and the scatterplot
    var svgspace1 = d3.select(el).append("svg")
                      .attr("class", "space1")
                      .attr("width", wFull)
                      .attr("height", 30);

// sets the relative area for the entire scatterplot svg element
    var svg = d3.select(el).append("svg")
                     .attr("class", "main")
                     .attr("width", wFull)
                     .attr("height", h + 20);

// sets some white space between the plots
    var svgspace2 = d3.select(el).append("svg")
                      .attr("class", "space2")
                      .attr("width", wFull)
                      .attr("height", 30);

// sets the relative area for the legend
    var svghud = d3.select(el).append("svg")
                     .attr("class", "hud")
                     .attr("width", w)
                     .attr("height", h/10);

// sets the relative area for the hazard function element
    var svghaz = d3.select(el).append("svg")
                     .attr("class", "haz")
                     .attr("width", wFull)
                     .attr("height", h + 50);

// extra space at bottom needed to create input variables
    var svgtest = d3.select(el).append("svg")
                     .attr("class", "test")
                     .attr("width", wFull)
                     .attr("height", h);

// FUNCTIONS ------------------------

    // kernelhazardEstimator takes in the type of kernel (e.g. epanechnikovKernel),
    // and maps the density of that kernel for each data point (x_i) in order to smooth
    // the estimate for the hazard function
    function kernelhazardEstimator(kernel, x) {
      return function(sample) {
        return x.map(function(x) {
          return [x, d3.sum(sample, function(v) {
            return v[3]*v[1]*kernel(x - v[0]);
          })];
        });
      };
    }

    // epanechnikov Kernel used for nonparametric density estimation
    // scale will be the variable binSize
    function epanechnikovKernel(scale) {
      return function(u) {
    // if the absolute value of u/scale is less than or
    //  equal to one, then output the functional statement .75 * (1 - u * u) / scale.
    //  Else output zero
        return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
      };
    }

    // calculates the epanechnikov kernel values
    function epFunc(u){
      return Math.abs(u /= binSize) <= 1 ? 0.75 * (1 - u * u) / binSize : 0;
    }

    // gets the relative location of the mouse at all times
    svg.on("mousemove", function(){
        mouse = d3.mouse(this);
    });

    // function to return data from subselection of variables from bbox coordinates
    var retDatasub = function(boxX, boxY, input){
        var datasub = [];
        if(input===false){
          data.forEach(function(d){
            if(+d[cc]>=(boxY - boxX) && +d[cc]<=(boxX + boxY)){
                datasub.push([+d.time, 0, 0, +d.status]);
            }
          });
        }
        else{
          data.forEach(function(d){
            if(+d[cc]>=boxX && +d[cc]<=boxY){
                datasub.push([+d.time, 0, 0, +d.status]);
            }
          });
        }
        datasub.forEach(function(d, i){
            datasub[i][1] = 1/(datasub.length-i);
            if(i>0){
                datasub[i][2] = datasub[i][1]*datasub[i][3] + datasub[i-1][2];
            } else{
                datasub[i][2] = datasub[i][1]*datasub[i][3];
            }
        });
        datasub.push([trange[1], 0, datasub[datasub.length-1][3], 0]);
        datasub.unshift([trange[0], 0, 0, 0]);
        return datasub;
    };

    // function to find the max of the computed kernel hazard data
    var maxdat = function(L, type){
      var L2 = [];
      if(type === 'haz'){
        for(i=0; i<L.length; i++){
          L2.push(+L[i][1]);
        }
      }
      else{
        for(i=0; i<L.length; i++){
          L2.push(+L[i][2]);
        }
      }
      //console.log(d3.max(L2));
      return d3.max(L2);
    };

    // function to update subset of data based on variable chosen
    var mgr = function(){
    // if statement helps to mitigate cpu workload by returning zero IF
    //  (mouse hasn't moved OR
    //  scatterplot is clicked) AND (no button has been pressed) THEN
    //  mgr will exit w/o calculating anything
        if(((mouseold[0]==mouse[0] && mouseold[1]==mouse[1]) || freeze!==0) && refresh===0){
            return;
        } else if(buttons === false && refresh === 1){
            return;
        }
        meval = yScale.invert(mouse[1]);
        bm = mxtocov(mouse[0])/2;
        var rectMax = yScale.invert(mouse[1]-covtoh(bm));
        var rectMin = yScale.invert(mouse[1]+covtoh(bm));
        datasub = [];
        data.forEach(function(d){
            if(+d[cc]>=(meval-bm) && +d[cc]<=(bm+meval)){
                datasub.push([+d.time, 0, 0, +d.status]);
            }
        });
        datasub.forEach(function(d, i){
            datasub[i][1] = 1/(datasub.length-i);
            if(i>0){
                datasub[i][2] = datasub[i][1]*datasub[i][3] + datasub[i-1][2];
            } else{
                datasub[i][2] = datasub[i][1]*datasub[i][3];
            }
        });
        datasub.push([trange[1], 0, datasub[datasub.length-1][3], 0]);
        datasub.unshift([trange[0], 0, 0, 0]);
        khedata = khe(datasub);
        svghaz.select("path.hazline")
                .datum(khedata)
                .transition().duration(100)
                .attr("d", hazr)
                .call(yAxishaz);
        svghaz.select("path.nahazline")
                .datum(datasub)
                .attr("d", nahaz);
        scat.select(".grayrect")
                .attr("y", mouse[1]-covtoh(bm))
                .attr("height", covtoh(mxtocov(mouse[0])));
        svg.select("text.minYtxt")
                .text("Minimum " + cc + " :  " +
                rectMin.toFixed(2));
        svg.select("text.maxYtxt")
                .text("Maximum " + cc + " :  " +
                rectMax.toFixed(2));
        svg.select("text.nData")
                .text("N:  " +  String(datasub.length-2));
        svghud.select("text.hudtxt")
                .text("marker window: " +  d3.round(mxtocov(mouse[0]), 2));
        mouseold = mouse;
        refresh = 0;
    };

    // calls mgr every 10 miliseconds
    setInterval(mgr, 10);

    // scalable functions make the axes in the hazard pdf plot scalable for the
    // data selected. Will be called
    // once the scatterplot above it is clicked and the subset of data is set
    var scalable = function(){
        meval = yScale.invert(mouse[1]);
        bm = mxtocov(mouse[0])/2;
        datasub = retDatasub(bm, meval, false);
        khedata = khe(datasub);
        maxNA = maxdat(datasub, 'hazNA');
        maxkhe = maxdat(khedata, 'haz');
        yhazRange = [0, maxkhe + maxkhe/4];
        yRange = [0, maxNA + maxNA/7];
        yScalehaz
            .domain(yhazRange)
            .range([h-pad*1.5, pad*1.5]);
        yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
        svghaz.select(".y.axis.haz")
            .transition().duration(250)
            .call(yAxishaz);
        svghaz.selectAll("path.hazline")
            .datum(khedata)
            .transition().duration(250)
            .attr("d", hazr)
            .call(yAxishaz);
        yScaleNA
            .domain(yRange)
            .range([h-pad*1.5, pad*1.5]);
        yAxisNA = d3.svg.axis().scale(yScaleNA).orient("left").ticks(10);
        svghaz.select("path.nahazline")
            .datum(datasub)
            .attr("d", nahaz)
            .call(yAxisNA);
        svghaz.select(".y.axis.NA")
            .transition().duration(250)
            .call(yAxisNA);
    };

    // scalable 2 is used when Max and Min are changed through the text inputs
    var scalable2 = function(rectMin, rectMax){
          datasub = retDatasub(rectMin, rectMax, true);
          khedata = khe(datasub);
          maxNA = maxdat(datasub, 'hazNA');
          maxkhe = maxdat(khedata, 'haz');
          yhazRange = [0, maxkhe + maxkhe/4];
          yRange = [0, maxNA + maxNA/7];
          yScalehaz
              .domain(yhazRange);
          yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
          svghaz.select(".y.axis.haz")
              .transition().duration(250)
              .call(yAxishaz);
          svghaz.selectAll("path.hazline")
              .datum(khedata)
              .transition().duration(250)
              .attr("d", hazr)
              .call(yAxishaz);
          yScaleNA
              .domain(yRange);
          yAxisNA = d3.svg.axis().scale(yScaleNA).orient("left").ticks(10);
          svghaz.select("path.nahazline")
              .datum(datasub)
              .attr("d", nahaz)
              .call(yAxisNA);
          svghaz.select(".y.axis.NA")
              .transition().duration(250)
              .call(yAxisNA);
          svg.select("text.nData")
                .text("N:  " + (datasub.length-2));
      };

      // scalable 3 is used when the binSize is changed by the user
      var scalable3 = function(rectMin, rectMax, binSize){
          svg.select("text.maxYtxt")
                  .text("Maximum " + cc + " :  " +
                  rectMax.toFixed(2));
          svg.select("text.minYtxt")
                  .text("Minimum " + cc + " :  " +
                  rectMin.toFixed(2));
          datasub = retDatasub(rectMin, rectMax, true);
          khe = kernelhazardEstimator(epanechnikovKernel(binSize), xScale.ticks(300));
          khedata = khe(datasub);
          maxNA = maxdat(datasub, 'hazNA');
          maxkhe = maxdat(khedata, 'haz');
          yhazRange = [0, maxkhe + maxkhe/4];
          yRange = [0, maxNA + maxNA/7];
          yScalehaz
              .domain(yhazRange);
          yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
          svghaz.select(".y.axis.haz")
              .transition().duration(100)
              .call(yAxishaz);
          svghaz.selectAll("path.hazline")
              .datum(khedata)
              .transition().duration(100)
              .attr("d", hazr)
              .call(yAxishaz);
          yScaleNA
              .domain(yRange);
          yAxisNA = d3.svg.axis().scale(yScaleNA).orient("left").ticks(10);
          svghaz.select("path.nahazline")
              .datum(datasub)
              .attr("d", nahaz)
              .call(yAxisNA);
          svghaz.select(".y.axis.NA")
              .transition().duration(100)
              .call(yAxisNA);
          svg.select("text.nData")
                .text("N:  " + (datasub.length-2));
      };

// RANGES, SCALES, and AXES ---------------------------

    // range for the time variable of the data imported
    // +d coerces variables to numericals
        var trange = [d3.min(data, function(d){return +d.time}),
          d3.max(data, function(d){ return +d.time;})];
    // covrange for the first varibale (cc) in the marker list
        var covrange = [d3.min(data, function(d){return +d[cc];}),
          d3.max(data, function(d){return +d[cc];})];
    // x scale for x axis for scatterplot and hazard graph
        var xScale = d3.scale.linear()
            .domain(trange)
            .range([pad*1.5, w-pad*1.5]);
    // y scale for y axis in scatterplot
        var yScale = d3.scale.linear()
            .domain(covrange)
            .range([h-pad*1.5, pad*1.5]);
    // y scale for nonparametric hazard estimation density (right y axis)
        var yScalehaz = d3.scale.linear()
            .domain([0, 0.75])
            .range([h-pad*1.5, pad*1.5]);
    // y scale for cumulative hazard (left y axis)
        var yScaleNA = d3.scale.linear()
            .domain([0, 3])
            .range([h-pad*1.5, pad*1.5]);
    // scale (under the current variable selected) for cursor x position to
    // covariate range between [0, max - min]
        var mxtocov = d3.scale.linear()
            .domain([pad*1.5, w-pad*1.5])
            .range([0, covrange[1]-covrange[0]]);
    // scale (under the current variable selected) for covariate range to height
    // of scatterplot area
        var covtoh = d3.scale.linear()
            .domain([0, covrange[1]-covrange[0]])
            .range([0, h - pad*3]);
    // x axis for both scatterplot and hazard pdf and cdf
        var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(10);
    // y axis for scatterplot
        var yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10);
    // y axis for hazard pdf (right side)
        var yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
    // y axis for hazard cdf (left side)
        var yAxisNA = d3.svg.axis().scale(yScaleNA).orient("left").ticks(10);
    // meval is the yScaled position of the mouse for the scatterplot
        var meval = yScale.invert(mouse[1]);
    // bm is the x position of the mouse divided by 2 (to place the cursor in the
    // middle of the gray box)
        var bm = mxtocov(mouse[0])/2;


// Scatterplot graph and output ----------------------

  // creates scatter plot
        var scat = svg.append("g")
                      .attr("class", "scatter")
                      .attr("width", wFull)
                      .attr("height", h)
                      .attr("transform", "translate("+(pad)+",0)");

  // creates large white rectangle for cursor=crosshair area
        scat.append("rect")
                .attr("class", "whiteRect")
                .attr("x", pad)
                .attr("y", 0)
                .attr("height", h)
                .attr("width", w - pad)
                .attr("fill", "white");

  // makes circles visible in the scatterplot graph
        scat.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                    .attr("cx", function(d){return xScale(+d.time) + pad;})
                    .attr("cy", function(d){return yScale(+d[cc]);})
                    .attr("r", 4)
                    .attr("fill", function(d){
                        return d.status==1 ? "rgb(0,0,180)" : "transparent";
                    })
                    .style("stroke-width", function(d){
                        return d.status==1 ? "0px" : "2px";
                    })
                    .style("stroke", "rgb(70,70,70)");
  // adds the x axis to the scatterplot
        scat.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate("+(pad)+","+(h-pad)+")")
                .style("stroke-width", "2px")
                .call(xAxis);
  // x axis label
        scat.append("text")
              .attr("class", "x label")
              .attr("text-anchor", "end")
              .attr("x", w/2 + pad)
              .attr("y", h + 20)
              .text("time");
  // adds the y axis to the scatterplot
        scat.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+(2*pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxis);
  // y axis label
        scat.append("g")
              .append("text")
              .attr("x", -200)
              .attr("y", 2)
              .attr("class", "y label")
              .attr("transform", "rotate(-90)")
              .attr("text-anchor", "middle")
              .text(cc);
  // shows the gray rectangle used for selecting data
        scat.append("rect")
                .attr("class", "grayrect")
                .attr("x", 2*pad)
                .attr("y", mouse[1]-covtoh(bm))
                .attr("height", covtoh(mxtocov(mouse[0])))
                .attr("width", w - 2*pad)
                .attr("fill", "gray")
                .attr("fill-opacity", 0.4);

  // displays maxY value selected
        svg.append("text")
                .attr("class", "maxYtxt")
                .attr("x", w + pad*2.5)
                .attr("y", pad + 10)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("Maximum " + cc + " :");
  // displays minY value selected
        svg.append("text")
                .attr("class", "minYtxt")
                .attr("x", parseFloat(d3.select(".maxYtxt").attr("x")))
                .attr("y", parseFloat(d3.select(".maxYtxt").attr("y")) + 50)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("Minimum " + cc + " :");
  // Displays number of datapoints selected
        svg.append("text")
                .attr("class", "nData")
                .attr("x", parseFloat(d3.select(".maxYtxt").attr("x")))
                .attr("y", parseFloat(d3.select(".minYtxt").attr("y")) + 50)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("N:");
  // Displays binSize selected
        svg.append("text")
                .attr("class", "binSelect")
                .attr("x", parseFloat(d3.select(".minYtxt").attr("x")))
                .attr("y", parseFloat(d3.select(".nData").attr("y") ) + 50)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("Bandwidth : " + binSize);

// EPANECHNIKOV bin size interactivity -----------------------------------------

  // creates rectangle for bin selection interaction
        svg.append("rect")
                .attr("class", "binInteract")
                .attr("x", parseFloat(d3.select(".minYtxt").attr("x")))
                .attr("y", 380)
                .attr("height", 50)
                .attr("width", 300 + pad)
                .attr("fill", "gray")
                .attr("fill-opacity", 0.4);
                //.attr("fill", "rgb(50,50,50)");
                //.attr("fill", "white");

  // Calculate epData for plotting
        epData = [];
        var nTimes = binMax * 100;
        for (var i = -nTimes; i <= nTimes; i++) {
          u = i/100;
          newU = epFunc(u);
          var epT = (1 - newU);
          epData.push([i, epT]);
        }

  // value for max of xscale
        var xC = binSize * nTimes;
  // x scale for epanechnikov bandwidth selector
        var xScaleEp = d3.scale.linear()
            .domain([-nTimes, nTimes])
            .range([w + pad*3, w + pad*3 + 300]);
  // epMinimum
        var epMin = d3.min(epData, function(d){return d[1];});
  // epMaximum
        var epMax = d3.max(epData, function(d){return d[1];});
  // yScale for Ep
        var yScaleEp = d3.scale.linear()
            .domain([epMax>=1 ? epMin : 0, epMax])
            //.domain([epMin, epMax])
            .range([215, 370]);
  // creates the line for the epData
        var epKern = d3.svg.line()
            .x(function(d){return xScaleEp(d[0]);})
            .y(function(d){return yScaleEp(d[1]);});
  // plots the path
        svg.append("path")
                .datum(epData)
                .attr("class", "epline")
                .style("stroke", "rgba(255,90,0,1)")
                .style("stroke-width", "4px")
                .style("fill-opacity","0")
                .attr("d", epKern);

  // sets scale for mouse x coordinate along rectangle to bin selection
      var binInterScale = d3.scale.linear()
        .domain([parseFloat(d3.select(".binInteract").attr("x")) + pad,
                  parseFloat(d3.select(".binInteract").attr("x")) + 300 - pad])
        .range([0.01, binMax]);

  // sets freeze to 1 and creates binBurn, which will indicate if black bar is clicked
        d3.select(".binInteract").on("mouseenter", function(){
                freeze = 1;
                //var binBurn = 0;
        // while the mouse moves along the black rectangle recalculate the kernel data
        // this is the same code as above
                d3.select(".binInteract").on("mousemove", function(){
                  if(binBurn===1){
                    return;
                  } else{
                    d3.select(".epline").remove();
                    epData = [];
                    nTimes = binMax * 100;
                    for (var i = -nTimes; i <= nTimes; i++) {;
                      u = i/100;
                      newU = epFunc(u);
                      var epT = (1 - newU);
                      epData.push([i, epT]);
                    }

                    binSize = Math.min(binInterScale(mouse[0]), binMax);
                    binSize = Math.max(binSize, 0.01);

                    var xC = binSize * nTimes;

                    var xScaleEp = d3.scale.linear()
                        .domain([-nTimes, nTimes])
                        .range([w + pad*3, w + pad*3 + 300]);

                    var epMin = d3.min(epData, function(d){return d[1];});
                    var epMax = d3.max(epData, function(d){return d[1];});

                    var yScaleEp = d3.scale.linear()
                        //.domain([epMax>=1 ? epMin : 0, epMax])
                        .domain([epMin, epMax])
                        .range([215, 370]);

                    var epKern = d3.svg.line()
                        .x(function(d){return xScaleEp(d[0]);})
                        .y(function(d){return yScaleEp(d[1]);});

                    svg.append("path")
                            .datum(epData)
                            .attr("class", "epline")
                            .style("stroke", "rgba(255,90,0,1)")
                            .style("stroke-width", "4px")
                            .style("fill-opacity","0")
                            .attr("d", epKern);

                    // output text for binSize selected
                    svg.select("text.binSelect")
                        .text("Bandwidth : " + d3.round(binSize,2));

                    rectMax = parseFloat(d3.select("text.maxYtxt").text().split(" ")[4]);
                    rectMin = parseFloat(d3.select("text.minYtxt").text().split(" ")[4]);
                    if(isNaN(rectMax) && isNaN(rectMin)){
                      rectMax = d3.max(data, function(d){return +d[cc];});
                      rectMin = d3.min(data, function(d){return +d[cc];});
                    }
                    scalable3(rectMin, rectMax, binSize)

                    // if clicked, indicate with binBurn, re-evaluate rect Max and Min
                    // from print statements, and scale hazard plot accordingly
                    d3.select(".binInteract").on("click", function(){
                      binBurn = binBurn===0 ? 1 : 0;
                      if(binBurn===0){
                        return;
                      }
                      /*rectMax = parseFloat(d3.select("text.maxYtxt").text().split(" ")[4]);
                      rectMin = parseFloat(d3.select("text.minYtxt").text().split(" ")[4]);
                      if(isNaN(rectMax) && isNaN(rectMin)){
                        rectMax = d3.max(data, function(d){return +d[cc];});
                        rectMin = d3.min(data, function(d){return +d[cc];});
                      }
                      scalable3(rectMin, rectMax, binSize);*/
                    });
                  }
                });
        });


// HAZARD Plotting -------------------------------------------------------------

  // calculates the x and y coordinates of the hazard pdf
        var hazr = d3.svg.line()
            .x(function(d){return xScale(d[0]) + 2*pad;})
            .y(function(d){return yScalehaz(d[1]);});
  // plots the cdf of the hazard function where each step represents a "death"
  // recorded in the subseted data
        var nahaz = d3.svg.area()
            .x(function(d){return xScale(d[0]) + 2*pad;})
            .y0(h-pad*1.5)
            .y1(function(d){return yScaleNA(d[2]);})
            .interpolate("step-after");

// DATA Transformation and SUB-selection ------------------------------------

  // pushes the subset of data highlighted by the gray rectangle selection
        data.forEach(function(d){
            if(+d[cc]>(meval-bm) & +d[cc]<(meval+bm)){
                datasub.push([+d.time, 0, 0, +d.status]);
            }
        });

  // sets the subset of data for when the ihazr function first starts up. Initially
  // pushes the data when the mouse has not moved. Will be redefined in mgr()
        datasub.forEach(function(d, i){
            datasub[i][1] = 1/(datasub.length-i);
            if(i>0){
                datasub[i][2] = datasub[i][1]*datasub[i][3] + datasub[i-1][2];
            } else{
                datasub[i][2] = datasub[i][1]*datasub[i][3];
            }
        });
        datasub.push([trange[1], 0, datasub[datasub.length-1][3], 0]);
        datasub.unshift([trange[0], 0, 0, 0]);

  // using an epanechnikov kernel with a scale of 1, holds the calculations of the
  // kernel for over 100 points for the time variable scaled along the x axis
        var khe = kernelhazardEstimator(epanechnikovKernel(binSize), xScale.ticks(300));
  // use previously defined kernel on data selected
        var khedata = khe(datasub);

// BEGIN VERY MESSY LEGEND CODE ------------------------------------------------

// sets location and color of time and marker window legend
        svghud.append("rect")
                .attr("x", pad*6)
                .attr("y", pad/4)
                .attr("width", w/2 + 2*pad - (w/3.9 + pad*2.5))
                .attr("height", h/10)
                .style("fill", "gray")
                .style("fill-opacity", "0.4");
/*// text elements for time window legend
        svghud.append("text")
                .attr("x", pad*3.3)
                .attr("y", 30)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("time window: 2 years");*/
// text elements for marker window legend
        svghud.append("text")
                .attr("class", "hudtxt")
                .attr("x", pad*6.3)
                .attr("y", 30)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("marker window: " +  d3.round(mxtocov(mouse[0]), 2));
// styles for points in scatterplot
        svghud.selectAll("legenddots")
                .data([15,35])
                .enter()
            .append("circle")
                .attr("cx", w/2 + 2*pad)
                .attr("cy", function(d){return d;})
                .attr("r", 4)
                .attr("fill", function(d, i){
// if set to zero, legend will return solid blue dot indicating event, else censored
// point indicated by i === 1 and transparent and black stroke-width
                    return i===0 ? "rgb(0,0,180)" : "transparent";
                })
                .style("stroke-width", function(d, i){
                    return i===0 ? "0px" : "2px";
                })
                .style("stroke", "rgb(70,70,70)");
        svghud.append("path")
                .style("stroke", "rgb(255,90,0)")
                .style("stroke-width", "4px")
                .attr("d", "M"+(w/1.5+pad)+","+15+"L"+(w/1.45+pad)+","+15);
//
        svghud.append("path")
                .style("stroke", "rgb(50,50,50)")
                .style("stroke-width", "8px")
                .attr("d", "M"+(w/1.5+pad)+","+35+"L"+(w/1.45+pad)+","+35);
        svghud.selectAll("legendtxt1")
                .data([19,40])
                .enter()
            .append("text")
                .attr("x", w/2+10 + 2*pad)
                .attr("y", function(d){return d;})
                .style("fill", "rgb(50,50,50)")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text(function(d,i){
                    return i===0 ? "death" : "censored";
                });
        // END VERY MESSY LEGEND CODE
        svghud.selectAll("legendtxt2")
                .data([19,40])
                .enter()
// displays legend text for hazard rate and cumulative hazard
            .append("text")
                .attr("x", w/1.45+5 + pad)
                .attr("y", function(d){return d;})
                .style("fill", "rgb(50,50,50)")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text(function(d,i){
                    return i===0 ? "hazard rate" : "cumulative hazard";
                });
        svghaz.append("path")
                .datum(datasub)
                .attr("class", "nahazline")
                .style("fill","rgb(50,50,50)")
                .style("shape-rendering", "crispEdges")
                .attr("d", nahaz);
        svghaz.append("path")
                .datum(khedata)
                .attr("class", "hazline")
                .style("stroke", "rgba(255,90,0,1)")
                .style("stroke-width", "4px")
                .style("fill-opacity","0")
                .attr("d", hazr);
        svghaz.append("g")
                .attr("class", "x axis haz")
                .attr("transform", "translate("+ 2*pad+","+(h-pad)+")")
                .style("stroke-width", "2px")
                .call(xAxis);
// x axis label
        svghaz.append("g")
              .append("text")
              .attr("class", "x haz label")
              .attr("text-anchor", "end")
              .attr("x", w/2 + 2*pad)
              .attr("y", h + 20)
              .text("time");
        svghaz.append("g")
                .attr("class", "y axis haz")
                .attr("transform", "translate("+(w+pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxishaz);
// y haz axis label
        svghaz.append("g")
              .append("text")
              .attr("x", -200)
              .attr("y", w + 3*pad)
              .attr("class", "y haz label")
              .attr("transform", "rotate(-90)")
              .attr("text-anchor", "middle")
              .text("hazard rate");
        svghaz.append("g")
                .attr("class", "y axis NA")
                .attr("transform", "translate("+(3*pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxisNA);
// y axis cumulative label
        svghaz.append("g")
              .append("text")
              .attr("x", -200)
              .attr("y", 2 + pad)
              .attr("class", "y haz NA label")
              .attr("transform", "rotate(-90)")
              .attr("text-anchor", "middle")
              .text("cumulative hazard");


// CHANGING VARIABLES ----------------------------------------------------------

// IF condition for when variables are changed
  // for clicking with buttons
          if(nVar > 1 && buttons === true){
            svgbut.on("click", function(){
    // gray rectangle is set to unclicked
              freeze = 0;
    // indicates that a new variable button has been clicked
              refresh = 1;
    // mt is the x coordinates of the mouse's current location
              var mt = d3.mouse(this)[0];
    // if statement will prevent plotting bug from occurring
              if(mt < 52){
                return;
              }
    // looks at the "key" names of the data and selects proper variable name
              cc = d3.keys(data[1]).slice(2, nCol)[
                Math.floor((mt-nVar-pad*1.5)/(w/nVar))];
    // recalculate scales and axes
              covrange = [d3.min(data, function(d){return +d[cc];}),
                d3.max(data, function(d){return +d[cc];})];
              yScale
                  .domain(covrange)
                  .range([h-pad*1.5, pad*1.5]);
              hazrange = [0, d3.max(data, function(d){return khe(+d[cc]);})];
              mxtocov
                  .domain([pad*1.5, w-pad*1.5])
                  .range([0, covrange[1]-covrange[0]]);
              covtoh
                  .domain([0, covrange[1]-covrange[0]])
                  .range([0, h-pad*3]);
              yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10);
    // circles are plotted based on new y scale values
              scat.selectAll("circle")
                      .transition().duration(500)
                      .attr("cy", function(d){return yScale(+d[cc]);});
              scat.select("text.y.label")
                      .text(cc);
    // y axis is plotted in scatterplot based on new variable selection
              scat.select(".y.axis")
                      .transition().duration(500)
                      .call(yAxis);
          });
  // ELSE if dropdown
          } else if(nVar > 1 && buttons === false){
              dropdown.on("change", function(){
                freeze = 0;
    // uses selected value name to distinguish variable name
                cc = d3.select(this).property('value');
                covrange = [d3.min(data, function(d){return +d[cc];}),
                d3.max(data, function(d){return +d[cc];})];
    // same changes as before...
              yScale
                  .domain(covrange)
                  .range([h-pad*1.5, pad*1.5]);
              hazrange = [0, d3.max(data, function(d){return khe(+d[cc]);})];
              mxtocov
                  .domain([pad*1.5, w-pad*1.5])
                  .range([0, covrange[1]-covrange[0]]);
              covtoh
                  .domain([0, covrange[1]-covrange[0]])
                  .range([0, h-pad*3]);
              yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10);
              scat.selectAll("circle")
                      .transition().duration(500)
                      .attr("cy", function(d){return yScale(+d[cc]);});
               scat.select("text.y.label")
                      .text(cc);
              scat.select(".y.axis")
                      .transition().duration(500)
                      .call(yAxis);
          });
          }

// CLICKING INPUTS -------------------------------------------------------------


        // allows user to change binSize by clicking on the input
        d3.select(".binSelect").on("click", function(){
          minInSig = 0;
          maxInSig = 0;
          binInSig += 1;
          if(binInSig===1){
            d3.select(".binSelect").style("opacity", 0);
            var binInput = d3.select(el).append("input")
                              .attr("class", 'binIn')
                              .style("right", "-" + d3.select('.binSelect').attr("x") + "px");
          } else{
            binInSig -= 1;
            return;
          }
          d3.select('.minIn').remove();
          d3.select(".minYtxt").style("opacity", 1);
          d3.select(".maxIn").remove();
          d3.select(".maxYtxt").style("opacity", 1);
        });

        // allows user to change maximum y value by clicking on the input
        d3.select(".maxYtxt").on("click", function(){
          minInSig = 0;
          binInSig = 0;
          maxInSig += 1;
          if(maxInSig===1){
            d3.select(".maxYtxt").style("opacity", 0);
            var maxInput = d3.select(el).append("input")
                              .attr("class", 'maxIn')
                              .style("right", "-" + d3.select('.maxYtxt').attr("x") + "px");
          } else{
            maxInSig -= 1;
            return;
          }
          d3.select('.minIn').remove();
          d3.select(".minYtxt").style("opacity", 1);
          d3.select(".binIn").remove();
          d3.select(".binSelect").style("opacity", 1);
        });

        // allows user to change minimum y value by clicking on the input
        d3.select(".minYtxt").on("click", function(){
          binInSig = 0;
          maxInSig = 0;
          minInSig += 1;
          if(minInSig===1){
            d3.select(".minYtxt").style("opacity", 0);
            var minInput = d3.select(el).append("input")
                              .attr("class", 'minIn')
                              .style("right", "-" + d3.select('.minYtxt').attr("x") + "px");
          } else{
            minInSig -= 1;
            return;
          }
          d3.select('.maxIn').remove();
          d3.select(".maxYtxt").style("opacity", 1);
          d3.select(".binIn").remove();
          d3.select(".binSelect").style("opacity", 1);
        });

        // clicking on the scatterplot clears all inputs and resets input signal
        // values (InSig's)
        d3.select(".scatter").on("click", function(){
          d3.select(".minYtxt").style("opacity", 1);
          d3.select(".maxYtxt").style("opacity", 1);
          d3.select(".binSelect").style("opacity", 1);
          d3.select('.maxIn').remove()
          d3.select('.minIn').remove()
          d3.select('.binIn').remove()
          if(freeze === 0){
            freeze = 1;
            scalable();
          }
          else{
            freeze = 0;
          }
          maxInSig = 0;
          minInSig = 0;
          binInSig = 0;
        });


// PRESSING ENTER --------------------------------------------------------------

        d3.select(el).on("keydown", function () {
          rectMax = parseFloat(d3.select("text.maxYtxt").text().split(" ")[4]);
          rectMin = parseFloat(d3.select("text.minYtxt").text().split(" ")[4]);
          binVal = parseFloat(d3.select("text.binSelect").text().split(" ")[4]);
          if(isNaN(rectMax) && isNaN(rectMin)){
            rectMax = d3.max(data, function(d){return +d[cc];});
            rectMin = d3.min(data, function(d){return +d[cc];});
          } else if(isNaN(binVal)){
            binVal = d3.round(binSize,2);
          }
          // ENTER key has the keyCode 13
          if (d3.event.keyCode === 13 && maxInSig === 1) {
            if(d3.select(".maxIn").node().value == ''){
              change = parseFloat(yScale(rectMax));
              hchange = covtoh(rectMax - rectMin);
            } else{
              change = parseFloat(yScale(d3.select(".maxIn").node().value));
              hchange = covtoh(d3.select(".maxIn").node().value - rectMin);
              rectMax = parseFloat(d3.select(".maxIn").node().value);
            }
            freeze = 1;
            d3.select('.grayrect')
              .attr("y", change);
            d3.select('.grayrect')
              .attr("height", hchange)
            d3.select('.maxIn').remove()
            d3.select(".maxYtxt")
              .style("opacity", 1);
            svg.select("text.maxYtxt")
                  .text("Maximum " + cc + " :  " +
                  rectMax.toFixed(2));
            maxInSig = 0;
            scalable2(rectMin, rectMax);
            return rectMax;
          } else if (d3.event.keyCode === 13 && minInSig === 1) {
            if(d3.select(".minIn").node().value == ''){
              hchange = parseFloat(covtoh(rectMax - rectMin));
            } else{
              hchange = covtoh(rectMax - d3.select(".minIn").node().value);
              rectMin = parseFloat(d3.select(".minIn").node().value);
            }
            freeze = 1;
            change = parseFloat(yScale(rectMax));
            d3.select('.grayrect')
              .attr("y", change)
              .attr("height", hchange)
            d3.select('.minIn').remove()
            d3.select(".minYtxt")
              .style("opacity", 1);
            svg.select("text.minYtxt")
                  .text("Minimum " + cc + " :  " +
                  rectMin.toFixed(2));
            scalable2(rectMin, rectMax);
            minInSig = 0;
            return rectMin;
          } else if(d3.event.keyCode === 13 && binInSig===1) {
            if(d3.select(".binIn").node().value === ''){
              binSize = binVal;
            } else{
              binSize = parseFloat(d3.select(".binIn").node().value);
            }
            freeze = 1;
            d3.select('.binIn').remove();
            d3.select(".binSelect")
              .style("opacity", 1);
            svg.select("text.binSelect")
                  .text("Bandwidth : " + binSize);

            d3.select(".epline").remove();

            epData = [];

            nTimes = binMax * 100;

            for (var i = -nTimes; i <= nTimes; i++) {;
              u = i/100;
              newU = epFunc(u);
              var epT = (1 - newU);
              epData.push([i, epT]);
            }

            var xC = binSize * nTimes;

            var xScaleEp = d3.scale.linear()
                .domain([-nTimes, nTimes])
                .range([w + pad*3, w + pad*3 + 300]);

            var epMin = d3.min(epData, function(d){return d[1];});
            var epMax = d3.max(epData, function(d){return d[1];});

            var yScaleEp = d3.scale.linear()
                //.domain([epMax>=1 ? epMin : 0, epMax])
                .domain([epMin, epMax])
                .range([215, 370]);

            var epKern = d3.svg.line()
                .x(function(d){return xScaleEp(d[0]);})
                .y(function(d){return yScaleEp(d[1]);});

            svg.append("path")
                    .datum(epData)
                    .attr("class", "epline")
                    .style("stroke", "rgba(255,90,0,1)")
                    .style("stroke-width", "4px")
                    .style("fill-opacity","0")
                    .attr("d", epKern);
            console.log(binSize);

            scalable3(rectMin, rectMax, binSize);
            binInSig = 0;
            return binSize;
          }
        })
  }

});
