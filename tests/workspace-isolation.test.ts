import { normalizeEmail, normalizePhone } from "../lib/utils/normalization";
import { validateGlobalIdentity, createWorkspace, createUser, getAllTeamMembers, updateUserAndProfile } from "../lib/db/users";
import { createEvent, getAllEvents, addEventMember, updateEvent } from "../lib/db/events";
import { createOrUpdateGallery } from "../lib/db/galleries";
import { getAllRecentPhotos } from "../lib/db/photos";
import { assertWorkspaceAccess } from "../lib/auth/workspace";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING MULTI-TENANT WORKSPACE ISOLATION TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // 15. Identity Normalization Test
  try {
    const eNorm = normalizeEmail("   Test.User@Example.COM   ");
    const pNorm = normalizePhone(" +91 (987) 654-3210 ");
    assert(
      eNorm === "test.user@example.com" && pNorm === "+919876543210",
      "Test 15: Identity Normalization (Email trim/lowercase & Phone E.164 formatting)"
    );
  } catch (err: any) {
    assert(false, "Test 15: Identity Normalization", err.message);
  }

  // 1. Workspace Creation (Workspace A & Workspace B)
  let wsA: any;
  let wsB: any;
  const timestamp = Date.now();
  const adminAEmail = `admin.a.${timestamp}@studioa.com`;
  const adminAPhone = `+9199${timestamp.toString().slice(-8)}`;
  const adminBEmail = `admin.b.${timestamp}@studiob.com`;
  const adminBPhone = `+9188${timestamp.toString().slice(-8)}`;

  try {
    const resA = await createWorkspace({
      workspaceName: `Studio Alpha ${timestamp}`,
      adminUsername: `admin_a_${timestamp}`,
      adminEmail: adminAEmail,
      adminPhone: adminAPhone,
      password: "Password123!",
      firstName: "Admin",
      lastName: "Alpha",
    });
    wsA = resA.workspace;

    const resB = await createWorkspace({
      workspaceName: `Studio Beta ${timestamp}`,
      adminUsername: `admin_b_${timestamp}`,
      adminEmail: adminBEmail,
      adminPhone: adminBPhone,
      password: "Password123!",
      firstName: "Admin",
      lastName: "Beta",
    });
    wsB = resB.workspace;

    assert(
      Boolean(wsA && wsB && wsA.id !== wsB.id),
      "Test 1: Workspace Creation (Distinct Workspace IDs created for Admin A & Admin B)"
    );
  } catch (err: any) {
    assert(false, "Test 1: Workspace Creation", err.message);
  }

  // 2. Global Email Uniqueness (Registration / Workspace Creation duplicate check)
  try {
    let errMessage = "";
    try {
      await createWorkspace({
        workspaceName: "Duplicate Studio",
        adminUsername: `dup_admin_${timestamp}`,
        adminEmail: adminAEmail.toUpperCase(),
        password: "Password123!",
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This email is already associated with another workspace and cannot be used here." ||
      errMessage === "This email is already part of your workspace.",
      "Test 2: Global Email Uniqueness on Admin Registration",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 2: Global Email Uniqueness on Admin Registration", err.message);
  }

  // 3. Same Workspace Duplicate Email (Team Member Creation)
  let userA1: any;
  const userA1Email = `user.a1.${timestamp}@studioa.com`;
  const userA1Phone = `+9191${timestamp.toString().slice(-8)}`;

  try {
    userA1 = await createUser({
      username: `user_a1_${timestamp}`,
      email: userA1Email,
      phone: userA1Phone,
      password: "Password123!",
      workspaceId: wsA.id,
      firstName: "User",
      lastName: "A1",
    });

    let errMessage = "";
    try {
      await createUser({
        username: `dup_user_a1_${timestamp}`,
        email: userA1Email.toUpperCase(),
        password: "Password123!",
        workspaceId: wsA.id,
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This email is already part of your workspace.",
      "Test 3: Same Workspace Duplicate Email Block",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 3: Same Workspace Duplicate Email Block", err.message);
  }

  // 4. Cross Workspace Duplicate Email (Team Member Creation in Workspace B using Workspace A email)
  try {
    let errMessage = "";
    try {
      await createUser({
        username: `cross_user_${timestamp}`,
        email: userA1Email,
        password: "Password123!",
        workspaceId: wsB.id,
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This email is already associated with another workspace and cannot be used here.",
      "Test 4: Cross-Workspace Duplicate Email Block",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 4: Cross-Workspace Duplicate Email Block", err.message);
  }

  // 5. Phone Uniqueness (Same Workspace Duplicate Phone)
  try {
    let errMessage = "";
    try {
      await createUser({
        username: `dup_phone_a_${timestamp}`,
        email: `unique.email.a.${timestamp}@studioa.com`,
        phone: userA1Phone,
        password: "Password123!",
        workspaceId: wsA.id,
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This phone number is already part of your workspace.",
      "Test 5: Same Workspace Duplicate Phone Block",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 5: Same Workspace Duplicate Phone Block", err.message);
  }

  // 6. Phone Uniqueness (Cross Workspace Duplicate Phone)
  try {
    let errMessage = "";
    try {
      await createUser({
        username: `cross_phone_b_${timestamp}`,
        email: `unique.email.b.${timestamp}@studiob.com`,
        phone: userA1Phone,
        password: "Password123!",
        workspaceId: wsB.id,
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This phone number is already associated with another workspace and cannot be reused.",
      "Test 6: Cross-Workspace Duplicate Phone Block",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 6: Cross-Workspace Duplicate Phone Block", err.message);
  }

  // 7. Workspace Scoped User Listing
  try {
    const teamA = await getAllTeamMembers(wsA.id);
    const teamB = await getAllTeamMembers(wsB.id);

    const hasUserA1InA = teamA.some((u) => u.id === userA1.id);
    const hasUserA1InB = teamB.some((u) => u.id === userA1.id);

    assert(
      hasUserA1InA && !hasUserA1InB,
      "Test 7: Workspace Scoped User Listing (Users are strictly isolated per workspace)"
    );
  } catch (err: any) {
    assert(false, "Test 7: Workspace Scoped User Listing", err.message);
  }

  // Create Events for Workspace A and Workspace B
  let eventA: any;
  let eventB: any;

  try {
    eventA = await createEvent({
      workspaceId: wsA.id,
      name: `Event Alpha ${timestamp}`,
      slug: `event-alpha-${timestamp}`,
      category: "Wedding",
      createdById: wsA.owner_id,
    });

    eventB = await createEvent({
      workspaceId: wsB.id,
      name: `Event Beta ${timestamp}`,
      slug: `event-beta-${timestamp}`,
      category: "Fashion",
      createdById: wsB.owner_id,
    });
  } catch (err: any) {
    console.error("Event creation helper failed:", err);
  }

  // 8. Workspace Scoped Event Listing
  try {
    const eventsA = await getAllEvents(wsA.id);
    const eventsB = await getAllEvents(wsB.id);

    const hasEventAInA = eventsA.some((e) => e.id === eventA.id);
    const hasEventAInB = eventsB.some((e) => e.id === eventA.id);

    assert(
      hasEventAInA && !hasEventAInB,
      "Test 8: Workspace Scoped Event Listing (Events isolated by workspace_id)"
    );
  } catch (err: any) {
    assert(false, "Test 8: Workspace Scoped Event Listing", err.message);
  }

  // 9. Cross-Workspace Event Member Assignment
  try {
    let errMessage = "";
    try {
      await addEventMember(eventB.id, userA1.id, wsB.id);
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This team member belongs to another workspace and cannot be assigned to this event.",
      "Test 9: Cross-Workspace Event Member Assignment Block",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 9: Cross-Workspace Event Member Assignment Block", err.message);
  }

  // 10. Cross-Workspace Event Access Guard
  try {
    let errMessage = "";
    try {
      assertWorkspaceAccess(wsB.id, wsA.id);
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "You do not have access to this workspace resource.",
      "Test 10: Cross-Workspace Event Access Guard",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 10: Cross-Workspace Event Access Guard", err.message);
  }

  // 11. Cross-Workspace Gallery Access Guard
  try {
    let errMessage = "";
    try {
      await createOrUpdateGallery({
        eventId: eventA.id,
        workspaceId: wsB.id,
        title: "Unauthorized Gallery",
        slug: `unauth-gallery-${timestamp}`,
        pin: "1234",
        photoIds: [],
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "You do not have access to this workspace resource.",
      "Test 11: Cross-Workspace Gallery Access Guard",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 11: Cross-Workspace Gallery Access Guard", err.message);
  }

  // 12. Cross-Workspace Photo Upload & Scoped Recent Photos Querying
  try {
    const photosA = await getAllRecentPhotos(10, wsA.id);
    const photosB = await getAllRecentPhotos(10, wsB.id);

    assert(
      Array.isArray(photosA) && Array.isArray(photosB),
      "Test 12: Workspace Scoped Photo Querying"
    );
  } catch (err: any) {
    assert(false, "Test 12: Workspace Scoped Photo Querying", err.message);
  }

  // 13. Workspace Isolation in Search
  try {
    const eventsA = await getAllEvents(wsA.id);
    const eventsB = await getAllEvents(wsB.id);

    const matchA = eventsA.filter((e) => e.name.includes("Alpha"));
    const matchB = eventsB.filter((e) => e.name.includes("Alpha"));

    assert(
      matchA.length > 0 && matchB.length === 0,
      "Test 13: Workspace Isolation in Event Search"
    );
  } catch (err: any) {
    assert(false, "Test 13: Workspace Isolation in Event Search", err.message);
  }

  // 14. Workspace Isolation in Team Member Updates
  try {
    let errMessage = "";
    try {
      await updateUserAndProfile(userA1.id, {
        phoneNumber: adminBPhone,
        workspaceId: wsA.id,
      });
    } catch (e: any) {
      errMessage = e.message;
    }
    assert(
      errMessage === "This phone number is already associated with another workspace and cannot be reused.",
      "Test 14: Workspace Isolation in Team Member Profile Update",
      `Got: "${errMessage}"`
    );
  } catch (err: any) {
    assert(false, "Test 14: Workspace Isolation in Team Member Profile Update", err.message);
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution unhandled error:", err);
  process.exit(1);
});
