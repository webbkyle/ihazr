#' ihazr
#'
#' \code{ihazr} interactively updates a hazard function for survival anaylisis.
#' This function creates an HTML widget for survival data. The widget allows the
#' user to choose subsections of their data and plot the nonparametric kernel
#' estimated hazard function and cumulative hazard function. Bin size selection
#' for the Epinechnikov kernel is also made available for the user.
#'
#' @import htmlwidgets
#' @param time A numerical vector of time data.
#' @param status A binary vector representing event or no event.
#' @param marker A collection of numerical variables of interest for survival
#'   analysis.
#' @param buttons Boolean argument to decide if buttons or a drop down feature
#'   will be used for variable selection. The default is set to TRUE.
#' @param binMax The maximum bin size for non parametric Epinechnikov hazard function.
#'   This will only need to be changed for visualizing the kernel.
#' @param width The width of the html widget. The default is NULL, which results
#'   in intelligent automatic sizing based on the widget's container.
#' @param height The height of the html widget. The default is NULL, which
#'   results in intelligent automatic sizing based on the widget's container.
#' @return ihazr interactive session for data values \code{time}, \code{status}, and \code{marker}
#' @examples
#' Example 1 - simulated data
#' time_t <- runif(50, 0, 10)
#' status_t <- rbinom(50, 1, .7)
#' age_t <- runif(50, 20, 80)
#' ihazr(time_t, status_t, age_t)
#'
#' Example 2 - with survival data
#' library(survival)
#' library(dplyr)
#' pbc5 <- pbc %>%
#'   slice(1:312) %>%
#'   select(time, status, age, edema, bili, albumin, protime) %>%
#'   mutate(time = time/365, status = (status==2)*1, bili = log(bili),
#'     protime = log(protime))
#' ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
#'
#' Example 3 - in a Shiny app
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
#' )
#'
#' Example 4 -- mgus2
#' library(survival)
#' library(dplyr)
#' mgusN <- mgus2 %>%
#'   mutate(time = futime/12)
#' ihazr(time=mgusN$time, status=mgusN$death, marker=mgusN[,c(2:6,8)], buttons = F, binMax=8)
#' @export
ihazr <- function(time, status, marker, buttons = TRUE, binMax = 10, width = NULL, height = NULL) {
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
      binMax = binMax
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
    # attempt to fix viewer window in RStudio
    sizingPolicy = htmlwidgets::sizingPolicy(
      viewer.suppress = TRUE
    ),
    package = 'ihazr'
  )
}

#' Widget output function for use in Shiny
#' @export
ihazrOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'ihazr', width, height, package = 'ihazr')
}

#' Widget render function for use in Shiny
#' @export
renderIhazr <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, ihazrOutput, env, quoted = TRUE)
}
