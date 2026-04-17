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
  | [Actions, "Grade" | { teacher_id: string; student_id: string }]
  | [
      Actions,
      | "Feedback"
      | {
          teacher_id: string;
          student_id: string;
          visibility: string;
        }
    ]
  | [Actions, "Counseling" | { teacher_id: string }]
  | [Actions, "all"];

export type AppAbility = MongoAbility<AppAbilities>;

export function defineAbilityFor(user: IUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.role === "TEACHER") {
    can("read", "Student");
    can("manage", "Counseling", { teacher_id: user._id });
    can("manage", "Feedback", { teacher_id: user._id });
    can("manage", "Grade", { teacher_id: user._id });
    can("read", "Teacher");
  } else if (user.role === "STUDENT") {
    can("read", "Student", { _id: user._id });
    can("read", "Grade", { student_id: user._id });
    can("read", "Feedback", { student_id: user._id, visibility: { $in: ["STUDENT", "ALL"] } });
  } else if (user.role === "PARENT") {
    const parentUser = user as IParentUser;
    can("read", "Student", { _id: { $in: parentUser.children } });
    can("read", "Grade", { student_id: { $in: parentUser.children } });
    can("read", "Feedback", {
      student_id: { $in: parentUser.children },
      visibility: { $in: ["PARENT", "ALL"] },
    });
  }

  return build({
    detectSubjectType: (object: any) => {
      if (object.role) return object.role as ExtractSubjectType<Subjects>; // For User discriminators
      return (object.__t as ExtractSubjectType<Subjects>) || "all";
    },
  });
}
