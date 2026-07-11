"use client";

import { useMemo } from "react";
import { useTranslation } from "./use-translation";

export function useMockLabels() {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      plan: (value: string) => {
        const map: Record<string, string> = {
          Free: t("mock.plans.free"),
          Basic: t("mock.plans.basic"),
          Pro: t("mock.plans.pro"),
          Enterprise: t("mock.plans.enterprise"),
        };
        return map[value] ?? value;
      },
      userStatus: (value: string) => {
        const map: Record<string, string> = {
          Active: t("mock.userStatus.active"),
          Inactive: t("mock.userStatus.inactive"),
          Suspended: t("mock.userStatus.suspended"),
        };
        return map[value] ?? value;
      },
      subscriptionStatus: (value: string) => {
        const map: Record<string, string> = {
          Active: t("mock.subscriptionStatus.active"),
          Canceled: t("mock.subscriptionStatus.canceled"),
          "Past Due": t("mock.subscriptionStatus.pastDue"),
        };
        return map[value] ?? value;
      },
      projectStatus: (value: string) => {
        const map: Record<string, string> = {
          Draft: t("mock.projectStatus.draft"),
          Published: t("mock.projectStatus.published"),
          Archived: t("mock.projectStatus.archived"),
        };
        return map[value] ?? value;
      },
      paymentMethod: (value: string) => {
        const map: Record<string, string> = {
          "Visa ending in 4242": t("mock.paymentMethods.visa"),
          "Mastercard ending in 8888": t("mock.paymentMethods.mastercard"),
          "Amex ending in 0001": t("mock.paymentMethods.amex"),
          PayPal: t("mock.paymentMethods.paypal"),
        };
        return map[value] ?? value;
      },
      adminAction: (value: string) => {
        const map: Record<string, string> = {
          "suspended user": t("activityFeed.actions.suspendedUser"),
          "activated user": t("activityFeed.actions.activatedUser"),
          "deleted user": t("activityFeed.actions.deletedUser"),
          "canceled subscription": t("activityFeed.actions.canceledSubscription"),
          "updated plan": t("activityFeed.actions.updatedPlan"),
          "refunded payment": t("activityFeed.actions.refundedPayment"),
          "exported report": t("activityFeed.actions.exportedReport"),
        };
        return map[value] ?? value;
      },
      feature: (value: string) => {
        const features: Record<string, string> = {
          "App Builder": t("mock.features.0"),
          "Code Export": t("mock.features.1"),
          "AI Assistant": t("mock.features.2"),
          Deploy: t("mock.features.3"),
          "Team Invite": t("mock.features.4"),
          Integrations: t("mock.features.5"),
          Analytics: t("mock.features.6"),
          Settings: t("mock.features.7"),
        };
        return features[value] ?? value;
      },
      role: (value: string) => {
        const map: Record<string, string> = {
          "Frontend Dev": t("mock.roles.frontendDev"),
          "Full Stack": t("mock.roles.fullStack"),
          "Product Manager": t("mock.roles.productManager"),
          Designer: t("mock.roles.designer"),
          CTO: t("mock.roles.cto"),
        };
        return map[value] ?? value;
      },
      userAction: (value: string) => {
        const map: Record<string, string> = {
          "Created project": t("mock.userActions.0"),
          "Deployed app": t("mock.userActions.1"),
          "Updated settings": t("mock.userActions.2"),
          "Invited teammate": t("mock.userActions.3"),
          "Exported code": t("mock.userActions.4"),
          "Ran AI assistant": t("mock.userActions.5"),
          "Published changes": t("mock.userActions.6"),
          "Forked template": t("mock.userActions.7"),
        };
        return map[value] ?? value;
      },
      dayShort: (value: string) => {
        const map: Record<string, string> = {
          Mon: t("behavior.days.0"),
          Tue: t("behavior.days.1"),
          Wed: t("behavior.days.2"),
          Thu: t("behavior.days.3"),
          Fri: t("behavior.days.4"),
          Sat: t("behavior.days.5"),
          Sun: t("behavior.days.6"),
        };
        return map[value] ?? value;
      },
    }),
    [t]
  );
}
