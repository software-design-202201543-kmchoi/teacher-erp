import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type ExtractSubjectType,
} from "@casl/ability";
import type { IUser, IParentUser } from "@teacher-erp/shared-types";

export type Actions = "manage" | "create" | "read" | "update" | "delete";
export type Subjects =
  | "User"
  | "Student"
  | "Teacher"
  | "Parent"
  | "Grade"
  | "Feedback"
  | "Counseling"
  | "all";

export type AppAbilities =
  | [Actions, "User"]
  | [Actions, "Student" | { _id: string }]
  | [Actions, "Teacher"]
  | [Actions, "Parent"]
  | [Actions, "Grade" | { teacherId: string; studentId: string }]
  | [
      Actions,
      | "Feedback"
      | {
          teacherId: string;
          studentId: string;
          isPublicToStudent: boolean;
          isPublicToParent: boolean;
        }
    ]
  | [Actions, "Counseling" | { teacherId: string }]
  | [Actions, "all"];

export type AppAbility = MongoAbility<AppAbilities>;

export function defineAbilityFor(user: IUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.role === "TEACHER") {
    can("read", "Student");
    can("manage", "Counseling", { teacherId: user._id });
    can("manage", "Feedback", { teacherId: user._id });
    can("manage", "Grade", { teacherId: user._id });
    can("read", "Teacher");
  } else if (user.role === "STUDENT") {
    can("read", "Student", { _id: user._id });
    can("read", "Grade", { studentId: user._id });
    can("read", "Feedback", { studentId: user._id, isPublicToStudent: true });
  } else if (user.role === "PARENT") {
    const parentUser = user as IParentUser;
    can("read", "Student", { _id: { $in: parentUser.children } });
    can("read", "Grade", { studentId: { $in: parentUser.children } });
    can("read", "Feedback", {
      studentId: { $in: parentUser.children },
      isPublicToParent: true,
    });
  }

  return build({
    detectSubjectType: (object: any) =>
      (object.__t as ExtractSubjectType<Subjects>) || "all",
  });
}
