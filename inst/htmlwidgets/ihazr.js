HTMLWidgets.widget({

  name: 'ihazr',

  type: 'output',

// initializes the layout of the svg on the webpage
  initialize: function(el, width, height) {

    return d3.select(el);
            /*.append("div")
              .attr("class", "entire")
              .attr("width", width)
              .attr("height", height)*/

  },

// renderValue function takes in
// -el: css elements to be modified by javascript package d3
// -x: values passed in from R to the widget itself
// ??? -instance:
  renderValue: function(el, x, instance) {
    var data = HTMLWidgets.dataframeToD3(x.data);
    var buttons = x.settings.buttons;
    var pad = 30;
    var w = 900;
    var wFull = w * 2;
    var h = 400;
    var nCol = d3.keys(data[1]).length;
    var nVar = d3.keys(data[1]).length - 2;
    var xPos = w + pad;
    var buttonWidth = w/(nVar) - 10;
    var buttonTextSize = Math.min(Math.floor(buttonWidth / 6), 30);

// sets the relative area for the number of variables besides time and status
    var svgbut = d3.select(el).append("svg")
            .attr("class", "button")
            .attr("width", w)
            .attr("height", h/5);

    var dropdown = d3.select(el).append("svg")
            .attr("class", "dropdown")
            .attr("width", w/5)
            .attr("height", h/5);


// sets the relative area for the entire scatterplot svg element
    var svg = d3.select(el).append("svg")
                     .attr("class", "scatter")
                     .attr("width", wFull)
                     .attr("height", h);

// sets the relative area for the hud element of the scatterplot svg element
    var svghud = d3.select(el).append("svg")
                     .attr("class", "hud")
                     .attr("width", w)
                     .attr("height", h/10);

// sets the relative area for the hazard function element
    var svghaz = d3.select(el).append("svg")
                     .attr("class", "haz")
                     .attr("width", wFull)
                     .attr("height", h);

// sets empty dataframe to be populated when clicked on dataregion in scatter
    var datasub = [];
// initial start for mouse location [x, y]
    var mouse = [w,h/2];
    var mouseold = [w,h/2];
// cc will start as first data variable but will change once clicked
    var cc = d3.keys(data[1])[2];
    //var cc = 0;
// freeze indicates if the scatterplot has been clicked (1, 2, 3) or not (0)
    var freeze = 0;
// refresh indicates if a button has been clicked (1) or not (0)
    var refresh = 0;

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
    function epanechnikovKernel(scale) {
      return function(u) {
// if the absolute value of u/scale is less than or
//  equal to one, then output the functional statement .75 * (1 - u * u) / scale.
//  Else output zero
        return Math.abs(u /= scale) <= 1 ? 0.75 * (1 - u * u) / scale : 0;
      };
    }

// gaussian kernel where s is the standard deviation (set to 1)
    function gaussianKernel(u, s = 1) {
      return function(x) {
        return Math.abs(x /= s) <= 1 ? 1/(Math.sqrt(2*Math.PI)*s) * exp(-((x-u)/s)^2) : 0;
        };
    }


// other nonparametric kernel smoothing funcitons: gaussian, uniform, triangle,
// triweight, cosine


// range for the time variable of the data imported
// +d coerces variables to numericals
        var trange = [d3.min(data, function(d){return +d.time}),
          d3.max(data, function(d){ return +d.time;})];
// covrange for the first varibale in the marker list
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
// !!! y scale for right y axis in hazard graph
        var yScalehaz = d3.scale.linear()
            .domain([0, 0.75])
            .range([h-pad*1.5, pad*1.5]);
// y scale for left y axis in hazard graph
        var yScaleNA = d3.scale.linear()
            .domain([0, 3])
            .range([h-pad*1.5, pad*1.5]);
// x scale (under the current variable selected) for cursor-data selection rect
// left side
        var mxtocov = d3.scale.linear()
            .domain([pad*1.5, w-pad*1.5])
            .range([0, covrange[1]-covrange[0]]);
// x scale (under the current variable selected) for cursor-data selection rect
// right side
        var covtoh = d3.scale.linear()
            .domain([0, covrange[1]-covrange[0]])
            .range([0, h-pad*3]);
// x axis for both scatterplot and hazard pdf and cdf
        var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(10);
// y axis for scatterplot
        var yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10);
// y axis for hazard pdf (right side)
        var yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
// y axis for hazard cdf (left side)
        var yAxisNA = d3.svg.axis().scale(yScaleNA).orient("left").ticks(10);
// meval is the yScaled position of the mouse for the scatterplot
// bm is the x position of the mouse divided by 2 (to place the cursor in the
// middle of the gray box)
        var meval = yScale.invert(mouse[1]);
        var bm = mxtocov(mouse[0])/2;
// gets the relative location of the mouse once it moves onto the svg (scatter)
// and freeze is set to 0
        svg.on("mousemove", function(){
            if(freeze!==0){return 0;}
            mouse = d3.mouse(this);
        });

// if the number of variables is greater than 1, will create the buttons
        if(nVar > 1 && buttons === true){
// creates the red rectangles for the variable buttons
          svgbut.selectAll(".rect.buttons")
                  .data(d3.keys(data[1]).slice(2, nCol))
                  .enter()
              .append("rect")
                  .attr("class", ".buttons")
                  .attr("x", function(d,i){
                      //return i*w/(d3.keys(data[1]).length-2)+5;
                      return i*w/(nVar)+nVar;
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
                      return (i+0.5)*w/(nVar);
                  })
                  .attr("y", h/10+2)
                  .attr("text-anchor", "middle")
                  .style("fill", "rgb(250,250,250)")
                  .style("font-weight", "bold")
                  .style("font-family", "Courier")
                  .style("font-size", buttonTextSize + "px")
                  .text(function(d){return d;});
        } else if(nVar > 1 && buttons === false){
// creates a drop down feature for selecting variables that can be typed into
          /*svgbut.append("text")
                .attr("class", ".buttons")
                .attr("contentEditable", true)
                .text(function(d) {return d.text;} )
                .on("keyup", function(d) { d.text = d3.select(this).text();});*/

          var options  = dropdown.append("select")
                              .selectAll("option")
                                .data(d3.keys(data[1]).slice(2, nCol))
                                .enter()
                                .append("option");

          options.text(function(d) {
              return d;
               })
                  .attr("value", function(d) {
                  return d;
                  });
        }
// makes circles visible in the scatterplot graph
        svg.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                    .attr("cx", function(d){return xScale(+d.time);})
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
        svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0,"+(h-pad)+")")
                .style("stroke-width", "2px")
                .call(xAxis);
// adds the y axis to the scatterplot
        svg.append("g")
                .attr("class", "y axis")
                .attr("transform", "translate("+(pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxis);
// shows the gray rectangle used for selecting data
        svg.append("rect")
                .attr("class", "grayrect")
                .attr("x", pad)
                .attr("y", mouse[1]-covtoh(bm))
                .attr("height", covtoh(mxtocov(mouse[0])))
                .attr("width", w)
                .attr("fill", "gray")
                .attr("fill-opacity", 0.4);
// svg elements for time bounds which will pop up in after second and
// third clicks
        svg.append("text")
                .attr("class", "time1");
        svg.append("text")
                .attr("class", "time2");
// minY value selected
        svg.append("text")
                .attr("class", "minYtxt")
                .attr("x", w + pad*2.5)
                .attr("y", pad + 10)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("Minimum " + cc + " selected:");
// maxY value selected
        svg.append("text")
                .attr("class", "maxYtxt")
                .attr("x", w + pad*2.5)
                .attr("y", pad + 40)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("Maximum " + cc + " selected:");
// plots the x and y coordinates of the hazard pdf
        var hazr = d3.svg.line()
            .x(function(d){return xScale(d[0]);})
            .y(function(d){return yScalehaz(d[1]);});
// plots the cdf of the hazard function where each step represents a "death"
// recorded in the subseted data
        var nahaz = d3.svg.area()
            .x(function(d){return xScale(d[0]);})
            .y0(h-pad*1.5)
            .y1(function(d){return yScaleNA(d[2]);})
            .interpolate("step-after");
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
        var khe = kernelhazardEstimator(epanechnikovKernel(1), xScale.ticks(100));
// use previously defined kernel on data selected
        var khedata = khe(datasub);

        // BEGIN VERY MESSY LEGEND CODE
// sets location and color of time and marker window legend
        svghud.append("rect")
                .attr("x", pad)
                .attr("y", pad/4)
                .attr("width", w/2.35)
                .attr("height", h/10)
                .style("fill", "gray")
                .style("fill-opacity", "0.4");
// text elements for time window legend
        svghud.append("text")
                .attr("x", pad*1.3)
                .attr("y", 30)
                .style("fill", "rgb(50,50,50")
                .style("font-family", "Arial")
                .style("font-size", "18px")
                .text("time window: 2 years");
// text elements for marker window legend
        svghud.append("text")
                .attr("class", "hudtxt")
                .attr("x", w/3.9)
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
                .attr("cx", w/2)
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
                .attr("d", "M"+w/1.5+","+15+"L"+w/1.45+","+15);
//
        svghud.append("path")
                .style("stroke", "rgb(50,50,50)")
                .style("stroke-width", "8px")
                .attr("d", "M"+w/1.5+","+35+"L"+w/1.45+","+35);
        svghud.selectAll("legendtxt1")
                .data([19,40])
                .enter()
            .append("text")
                .attr("x", w/2+10)
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
                .attr("x", w/1.45+5)
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
                .attr("transform", "translate(0,"+(h-pad)+")")
                .style("stroke-width", "2px")
                .call(xAxis);
        svghaz.append("g")
                .attr("class", "y axis haz")
                .attr("transform", "translate("+(w-pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxishaz);
        svghaz.append("g")
                .attr("class", "y axis NA")
                .attr("transform", "translate("+(pad)+",0)")
                .style("stroke-width", "2px")
                .call(yAxisNA);

// function to return data from subselection of variables from bbox coordinates
        var retDatasub = function(boxX, boxY){
          datasub = [];
            data.forEach(function(d){
                if(+d[cc]>(boxY-boxX) & +d[cc]<boxY+boxY){
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
        function mgr(){
// if statement helps to mitigate cpu workload by returning zero IF (mouse hasn't moved OR scatterplot is clicked) AND (no button has been pressed) THEN mgr will exit w/o calculating anything
            if(((mouseold[0]==mouse[0] && mouseold[1]==mouse[1]) || freeze!==0) && refresh===0){
                return 0;
            }
            meval = yScale.invert(mouse[1]);
            bm = mxtocov(mouse[0])/2;
            rectMax = yScale.invert(mouse[1]-covtoh(bm));
            rectMin = yScale.invert(mouse[1]+covtoh(bm));
            datasub = retDatasub(bm, meval);
            khedata = khe(datasub);
            svghaz.select("path.hazline")
                    .datum(khedata)
                    .transition().duration(100)
                    .attr("d", hazr)
                    .call(yAxishaz);
            svghaz.select("path.nahazline")
                    .datum(datasub)
                    .attr("d", nahaz);
            svg.select(".grayrect")
                    .attr("y", mouse[1]-covtoh(bm))
                    .attr("height", covtoh(mxtocov(mouse[0])));
            svg.select("text.minYtxt")
                    .text("Minimum " + cc + " selected:  " +
                    rectMin.toFixed(2));
            svg.select("text.maxYtxt")
                    .text("Maximum " + cc + " selected:  " +
                    rectMax.toFixed(2));
            svghud.select("text.hudtxt")
                    .text("marker window: " +  d3.round(mxtocov(mouse[0]), 2));
            mouseold = mouse;
            refresh = 0;
        }

// calls mgr every 10 miliseconds
        setInterval(mgr, 10);

        svgbut.on("click", function(){


// gray rectangle is set to unclicked
            freeze = 0;
// indicates that a new variable button has been clicked
            refresh = 1;
// mt is the x coordinates of the mouse's current location
            var mt = d3.mouse(this)[0];

// looks at the "key" names of the data and slices off all the data with the key
// selected
            cc = d3.keys(data[1]).slice(2, nCol)[
              Math.floor(mt/(w/(nVar)))];
// indicates the range of the selected variable
            covrange = [d3.min(data, function(d){return +d[cc];}),
              d3.max(data, function(d){return +d[cc];})];
// y scale changed based on new covrange after new variable clicked
            yScale
                .domain(covrange)
                .range([h-pad*1.5, pad*1.5]);
// !!! hazrange for the first varibale in the marker list (right now this is "age")
            hazrange = [0, d3.max(data, function(d){return khe(+d[cc]);})];
// changes the size of gray rect for cursor-data selection on the left
            mxtocov
                .domain([pad*1.5, w-pad*1.5])
                .range([0, covrange[1]-covrange[0]]);
// changes the size of gray rect for cursor-data selection on the right side
            covtoh
                .domain([0, covrange[1]-covrange[0]])
                .range([0, h-pad*3]);
// new y axis calculated based on new y scale defined above
            yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(10);
// circles are plotted based on new y scale values
            svg.selectAll("circle")
                    .transition().duration(1000)
                    .attr("cy", function(d){return yScale(+d[cc]);});
// y axis is plotted in scatterplot based on new variable selection
            svg.select(".y.axis")
                    .transition().duration(1000)
                    .call(yAxis);
        });

// function that makes the axes in the hazard pdf plot scalable. Will be called
// once the scatterplot above it is clicked and the subset of data is set
        var scalable = function(){
          meval = yScale.invert(mouse[1]);
          bm = mxtocov(mouse[0])/2;
          datasub = retDatasub(bm, meval);
          khedata = khe(datasub);
          maxNA = maxdat(datasub, 'hazNA');
          maxkhe = maxdat(khedata, 'haz');
          yhazRange = [0, maxkhe + maxkhe/4];
          yRange = [0, maxNA + maxNA/7];
          yScalehaz
              .domain(yhazRange);
          yAxishaz = d3.svg.axis().scale(yScalehaz).orient("right").ticks(10);
          svghaz.select(".y.axis.haz")
              .transition().duration(500)
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
              .transition().duration(100)
              .attr("d", nahaz)
              .call(yAxisNA);
          svghaz.select(".y.axis.NA")
              .transition().duration(500)
              .call(yAxisNA);
        };

        var timebounds = function(data){

        };

// on the click of the scatterplot and setting of the gray rectangle bounds,
// the freeze value will be set to 1 to initailly scale the hazard function and
// set y bounds
// freeze will be set to two on the second click of the svg element. This will set
// the minimum time bound
// freeze will then be set to 3 on the third click of the svg element and the
// maximum time bound will be selected.
// Lastly, freeze will be reset to 0 on the fourth click
        svg.on("click", function(){
            if(freeze===0){
                freeze=1;
                scalable();
            }
            /*else if(freeze===1){
                freeze += 1;
                var tMouse = d3.mouse(this)[0];
                svg.select("text.time1")
                    .attr("x", w + pad*2.5)
                    .attr("y", pad + 100)
                    .style("fill", "rgb(50,50,50")
                    .style("font-family", "Arial")
                    .style("font-size", "18px")
                    .text("Minimum time selected:  " + d3.round(xScale.invert(tMouse), 2));
            }
            else if(freeze===2){
                freeze += 1;
                var tMouse2 = d3.mouse(this)[0];
                svg.select("text.time2")
                    .attr("x", w + pad*2.5)
                    .attr("y", pad + 130)
                    .style("fill", "rgb(50,50,50")
                    .style("font-family", "Arial")
                    .style("font-size", "18px")
                    .text("Maximum time selected:  " + d3.round(xScale.invert(tMouse2), 2));
            }*/
            else{
              freeze=0;
              /*svg.select("text.time1")
                    .text("Minimum time selected:  ");
              svg.select("text.time2")
                    .text("Maximum time selected:  ");*/
            }
        });


  }//,

/*  resize: function(el, width, height, instance) {

  }*/

});
