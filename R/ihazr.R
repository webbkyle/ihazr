# ihazr is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# ihazr is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.


#' ihazr
#'
#' \code{ihazr} stands for "interative hazard regression." The function can be
#' used as an exploratory analysis tool for survival data. \code{ihazr} provides
#' an R user interface for outputting a JavaScript D3.js web application. The
#' user provides a vector of survival times, a vector of censoring statuses, and
#' a matrix (or data.frame or tibble) of marker (covariate) values. The function
#' outputs an interactive application where the user can 1) select which marker
#' to plot against time and 2) graphically resize the time and marker bandwidths
#' for calculating a nonparametric conditional hazard function estimate.
#'
#' @import htmlwidgets
#' @param time A vector of observed follow up times.
#' @param status A vector of status indicators, usually 0=alive, 1=dead.
#' @param marker A matrix or data frame or tibble of marker (covariate) values
#' where each column is a covariate and each row is an observation. The column
#' names will be used to identify each marker in the resulting interactive
#' application.
#' @param buttons TRUE or FALSE, where TRUE means each marker will have its own
#' button and FALSE means markers are selected via a dropdown menu. TRUE is
#' recommended for few markers and FALSE is recommended for many markers. The
#' default is to use buttons (TRUE).
#' @param bandMax A number representing the maximum bandwidth for the Epanechnikov
#' kernel. The interactive application has an area for graphically adjusting the
#' Epanechnikov kernel bandwidth for smoothing the time dimension. This value sets
#' the maximum bandwidth available. The number defaults to 10 but may be adjusted
#' depending on the scale of the \code{time} vector.
#' @param width The width of the html widget. The default is NULL, which results
#'   in intelligent automatic sizing based on the widget's container.
#' @param height The height of the html widget. The default is NULL, which
#'   results in intelligent automatic sizing based on the widget's container.
#' @details This funciton creates an interactive web application for calculating
#' non parametric conditional hazard function estimates for univariate marker
#' values. Details for the conditional hazard estimator are in McKeague and Utikal
#' (1990), but the general idea is to 1) calculate the Nelson-Aalen estimator on
#' the subset of data that has marker values falling within a specified window
#' 2) smooth the result using an Epanechnikov kernel (analogous to the way kernel
#' density estimation can be seen as a kernel smoothing of the empirical cumulative
#' distribution function). \cr \cr
#' The estimation procedure requires both a marker bandwidth (to specify the width
#' of the window) and a time bandwidth (to specify the Epanechnikov kernel). The
#' main interactive capability of the application is to allow the user to graphically
#' adjust both of these bandwidths and get immediate visual feedback on how the
#' resulting estimates change. \cr \cr
#'   ihazr user interface: \cr
#'   - Move cursor over the scatterplot to subset data and click to freeze/unfreeze the selection. \cr
#'   - Click on buttons or options in a dropdown to select different covariates. \cr
#'   - Double-click Maximum, Minimum, or Bandwidth text boxes to input numerical values.
#'     Press Enter to commit the value. Click on the scatterplot to clear the input box. \cr
#'   - Mouseover the gray bar below the Epanechnikov kernel to change the kernel's bandwidth.
#'     Click to freeze/unfreeze the bandwidth selection. \cr \cr
#'  \code{ihazr} was developed using D3.js and \code{htmlwidgets}.
#' @return A JavaScript D3.js web application. The top display is a scatterplot
#' of follow up time (x-axis) versus selected marker value (y-axis) with censoring
#' status indicated by the color/style of each point. The bottom display
#' dynamically updates nonparametric estimates of the Nelson-Aalen function and
#' conditional hazard function.
#'
#' @references
#' McKeague, IW and Utikal, KJ (1990). Inference for a Nonlinear Counting Process
#' Regression Model. \emph{Annals of Statistics}.
#' \href{https://doi.org/10.1214/aos/1176347745}{link} \cr \cr
#' Wang, JL (2005). Smoothing Hazard Rates. \emph{Encyclopedia of Biostatistics}.
#' \href{https://doi.org/10.1002/0470011815.b2a11069}{link}
#'
#' @examples
#' #Example 1 - simulated data
#' time_t <- runif(50, 0, 10)
#' status_t <- rbinom(50, 1, .7)
#' age_t <- runif(50, 20, 80)
#' ihazr(time_t, status_t, age_t)
#'
#' #Example 2 - with survival data
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>%
#'   slice(1:312) %>%
#'   select(time, status, age, edema, bili, albumin, protime) %>%
#'   mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'     protime = log(protime))
#' ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'
#' #Example 3 -- mgus2
#' library(survival)
#' library(dplyr)
#' mgusN <- mgus2 %>%
#'   mutate(time = futime/12)
#' ihazr(time=mgusN$time, status=mgusN$death, marker=mgusN[,c(2:6,8)], buttons = FALSE, bandMax=8)
#' @export
ihazr <- function(time, status, marker, buttons = TRUE, bandMax = 10, width = NULL, height = NULL) {
  # forward options using x
    x <- data.frame(
      time = time,
      status = status
    )
    if(any(sapply(marker, is.factor))){
      m.factors <- which(sapply(marker, is.factor))
      marker[, m.factors] <- sapply(marker[, m.factors], as.numeric) - 1
    }
    x <- cbind(x, marker)
    x <- x[order(x$time), ]

    settings <- list(
      buttons = buttons,
      bandMax = bandMax
    )

    x <- list(
      data = x,
      settings = settings
    )

    cat(
      "ihazr version 0.1.0, Copyright (C) 2018 Jason Liang and Kyle Webb.
      ihazr comes with ABSOLUTELY NO WARRANTY. This is free software,
      and you are welcome to redistribute it under certain conditions.
      See Copyright and GPL-2 Licensing for details."
    )

  # create widget
  htmlwidgets::createWidget(
    name = 'ihazr',
    x,
    width = width,
    height = height,
    sizingPolicy = htmlwidgets::sizingPolicy(
      viewer.suppress = TRUE
    ),
    package = 'ihazr'
  )
}

#' ihazrOutput
#'
#' \code{ihazrOutput} produces a Shiny widget with the same characteristics as the
#' locally hosted output from \code{ihazr}.
#'
#' @import htmlwidgets
#' @param outputId The rendered output name.
#' @param width The percent width of the screen used for the Shiny App.
#' @param height Height of the Shiny App in pixels.
#' @examples
#' \dontrun{
#' #Example - ihazr in a Shiny app
#' library(shiny)
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>% slice(1:312) %>%
#'       select(time, status, age, edema, bili, albumin, protime) %>%
#'       mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'         protime = log(protime))
#' shinyApp(
#'   ui = ihazrOutput("test"),
#'   server = function(input, output) {
#'     output$test <- renderIhazr(
#'       ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'       )
#'   }
#' )}
#' @export
ihazrOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'ihazr', width, height, package = 'ihazr')
}

#' renderIhazr
#'
#' \code{renderIhazr} produces a Shiny widget with the same characteristics as the
#' locally hosted output from \code{ihazr}.
#'
#' @import htmlwidgets
#' @param expr An expression in the form of the \code{ihazr} function.
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Whether \code{expr} is quoted or not.
#' @examples
#' \dontrun{
#' #Example - ihazr in a Shiny app
#' library(shiny)
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>% slice(1:312) %>%
#'       select(time, status, age, edema, bili, albumin, protime) %>%
#'       mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'         protime = log(protime))
#' shinyApp(
#'   ui = ihazrOutput("test"),
#'   server = function(input, output) {
#'     output$test <- renderIhazr(
#'       ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'       )
#'   }
#' )}
#' @export
renderIhazr <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, ihazrOutput, env, quoted = TRUE)
}
