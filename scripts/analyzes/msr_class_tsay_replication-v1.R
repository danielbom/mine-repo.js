setwd("/Users/igorscaliantewiese/Downloads/")
#https://stats.idre.ucla.edu/r/dae/logit-regression/
library(ggplot2)
library(effsize)
library(sqldf)
library(Hmisc)


#reading file
df = read.csv(file="all.csv", header = TRUE, sep=",")


# Basic box plot
p <- ggplot(df, aes(x=language, y=stars)) + 
  geom_boxplot()
p

#### summary
summary(df)

#subsetting
langC <- df[ which(df$language=='C'), ]
langPHP <- df[ which(df$language=='PHP'), ]
langRuby <- df[ which(df$language=='Ruby'), ]
langJavascript <- df[ which(df$language=='JavaScript'), ]

cor.test(langPHP$files_changed_count,langPHP$changed_counts, method="spearman")
plot(langPHP$stars,langPHP$changed_counts)

summary(langJavascript)
hist(langC$stars)
######

langPHP_StarsDistinct = sqldf("select distinct stars from langPHP")
langRuby_StarsDistinct = sqldf("select distinct stars from langRuby")
langC_StarsDistinct = sqldf("select distinct stars from langC")
langJavaScript_StarsDistinct = sqldf("select distinct stars from langJavascript")



wilcox.test(langRuby_StarsDistinct$stars, langPHP_StarsDistinct$stars)
summary(langPHP_StarsDistinct$stars)


wilcox.test(langC_StarsDistinct$stars, langPHP_StarsDistinct$stars)
res = cliff.delta(langC_StarsDistinct$stars,langPHP_StarsDistinct$stars,return.dm=TRUE)
print(res)

res = cliff.delta(langJavaScript_StarsDistinct$stars,langPHP_StarsDistinct$stars,return.dm=TRUE)
print(res)

df$is_merged <- factor(df$is_merged)
df$has_test <- factor(df$has_test)
df$is_following <- factor(df$is_following)

describe(df)

langC$is_merged = factor(langC$is_merged)
langC$has_test  = factor(langC$has_test)
langC$is_following = factor(langC$is_following)

str(df)

mylogit <- glm(is_merged ~ has_test + log1p(files_changed_count) + log1p(changed_counts) + log1p(prior_iterations_count) + is_following + log1p(pr_comments_count), data = df, family = "binomial")

mylogitC <- glm(is_merged ~ has_test + log1p(files_changed_count) + log1p(changed_counts) + log1p(prior_iterations_count) + is_following + log1p(pr_comments_count), data = langC, family = "binomial")

summary(mylogit)
exp(coef(mylogit))
exp(15,248716)

summary(mylogitC)
exp(coef(mylogitC))

exp(1.63197)

