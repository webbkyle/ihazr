library(dplyr)
library(survival)
library(ihazr)

pbc5 <- pbc %>%
  slice(1:312) %>%
  select(time, status, age, edema, bili, albumin, protime) %>%
  mutate(time = time/365, status = (status==2)*1,
         bili = log(bili), protime = log(protime))

ihazr(time=pbc5[,1], status=pbc5[,2], marker=pbc5[,3:7])
