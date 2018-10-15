#' ihazr
#'
#' \code{ihazr} interactively updates a hazard function for survival anaylisis.
#' This function creates an HTML widget for survival data. The widget allows the
#' user to choose subsections of their data and plot the nonparametric kernel
#' estimated hazard function and cumulative hazard function. Bandwidth selection
#' for the Epanechnikov kernel is also made available for the user.
#'
#' @import htmlwidgets
#' @param time A numerical vector of time data.
#' @param status A binary vector representing event or no event.
#' @param marker A collection of numerical variables of interest for survival
#'   analysis.
#' @param buttons Boolean argument to decide if buttons or a drop down feature
#'   will be used for variable selection. The default is to use buttons (TRUE).
#' @param bandMax The maximum bandwidth for the non parametric Epinechnikov hazard function.
#'   This will only need to be changed for visualizing the kernel.
#' @param width The width of the html widget. The default is NULL, which results
#'   in intelligent automatic sizing based on the widget's container.
#' @param height The height of the html widget. The default is NULL, which
#'   results in intelligent automatic sizing based on the widget's container.
#' @details ihazr implements the Epanechnikov kernel for non-parametric hazard estimation
#'   with user defined bandwidth and the Nelson-Aalen estimator for the cumulative hazard rate. \cr \cr
#'   ihazr user interface: \cr
#'   - Move cursor over the scatterplot to subset data and click to freeze/unfreeze the selection. \cr
#'   - Click on buttons or options in a dropdown to select different covariates. \cr
#'   - Double-click Maximum, Minimum, or Bandwidth text boxes to input numerical values.
#'     Press Enter to commit the value. Click on the scatterplot to clear the input box. \cr
#'   - Mouseover the black bar below the Epanechnikov kernel to change the kernel's bandwidth.
#'     Click to freeze/unfreeze the bandwidth selection.
#' @return ihazr interactive session for data values \code{time}, \code{status}, and \code{marker}
#'
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
